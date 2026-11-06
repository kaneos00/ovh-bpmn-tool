export type DrawioImportResult = {
  xml: string;
  warnings: string[];
};

type Bounds = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type NodeInfo = {
  sourceId: string;
  id: string;
  type: 'startEvent' | 'endEvent' | 'intermediateCatchEvent' | 'task' | 'exclusiveGateway' | 'dataObjectReference' | 'dataStoreReference';
  name: string;
  bounds: Bounds;
};
type EdgeInfo = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: 'sequenceFlow' | 'dataInputAssociation' | 'dataOutputAssociation';
  waypoints: Point[];
};
type PageInfo = { name: string; model: Element };

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const attr = (element: Element, name: string) => element.getAttribute(name) ?? '';
const numberAttr = (element: Element, name: string, fallback = 0) => {
  const value = Number.parseFloat(attr(element, name));
  return Number.isFinite(value) ? value : fallback;
};
const safeId = (value: string) => value.replace(/[^A-Za-z0-9_.-]/g, '_');
const pagePrefix = (index: number) => `Page${index + 1}_`;

const parseXml = (xml: string, description: string): Document => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) {
    const detail = document.querySelector('parsererror')?.textContent?.trim();
    throw new Error(`Le XML ${description} est invalide${detail ? ` : ${detail}` : '.'}`);
  }
  return document;
};

const absoluteBounds = (cell: Element, cells: Map<string, Element>): Bounds => {
  let x = 0;
  let y = 0;
  let width = 100;
  let height = 80;
  let current: Element | undefined = cell;
  const visited = new Set<string>();
  while (current) {
    const currentId = attr(current, 'id');
    if (currentId && visited.has(currentId)) break;
    if (currentId) visited.add(currentId);
    const geometry = Array.from(current.children).find(child => child.localName === 'mxGeometry');
    if (geometry) {
      x += numberAttr(geometry, 'x');
      y += numberAttr(geometry, 'y');
      width = numberAttr(geometry, 'width', width);
      height = numberAttr(geometry, 'height', height);
    }
    const parentId = attr(current, 'parent');
    current = parentId ? cells.get(parentId) : undefined;
  }
  return { x, y, width, height };
};

const classifyNode = (style: string, label = ''): NodeInfo['type'] | undefined => {
  const normalized = style.toLowerCase();
  // Only the explicit Draw.io data-store symbol is a BPMN data store.
  // "dataStorage" is intentionally not treated as a data object: the
  // corrected reference file identifies that shape as a regular task.
  if (/shape=datastore(?:;|$)/.test(normalized)) return 'dataStoreReference';
  if (normalized.includes('shape=mxgraph.bpmn.data2') || /shape=data2(?:;|$)/.test(normalized)) {
    return 'dataObjectReference';
  }
  if (normalized.includes('mxgraph.bpmn.event')) {
    if (normalized.includes('outline=end') || normalized.includes('symbol=terminate') || /^(end|fin)$/i.test(label.trim())) return 'endEvent';
    if (normalized.includes('outline=catching') || normalized.includes('outline=throwing') ||
        normalized.includes('intermediate')) return 'intermediateCatchEvent';
    return 'startEvent';
  }
  if (normalized.includes('doubleellipse') || normalized.includes('shape=ellipse')) return 'startEvent';
  if (normalized.includes('rhombus') || normalized.includes('gateway')) return 'exclusiveGateway';
  // The supplied corrected BPMN keeps generic rectangles, document shapes,
  // and the Draw.io dataStorage shape as tasks.
  if (normalized.includes('task') || normalized.includes('rounded=') ||
      normalized.includes('shape=document') || normalized.includes('shape=datastorage') ||
      normalized.includes('shape=rect') || normalized.includes('rectstyle=')) return 'task';
  return undefined;
};

const center = (bounds: Bounds): Point => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

const buildPage = (page: PageInfo, pageIndex: number, warnings: string[]) => {
  const prefix = pagePrefix(pageIndex);
  const cells = new Map<string, Element>();
  page.model.querySelectorAll('mxCell').forEach(cell => {
    const id = attr(cell, 'id');
    if (id) cells.set(id, cell);
  });

  const nodes: NodeInfo[] = [];
  cells.forEach(cell => {
    if (attr(cell, 'vertex') !== '1') return;
    const style = attr(cell, 'style');
    if (style.toLowerCase().includes('shape=lane') || style.toLowerCase().includes('shape=swimlane')) {
      warnings.push(`Page ${pageIndex + 1} : les lanes ne sont pas encore traitées et seront ignorées.`);
      return;
    }
    const type = classifyNode(style, attr(cell, 'value'));
    if (!type) return;
    const sourceId = attr(cell, 'id');
    if (!sourceId) return;
    nodes.push({
      sourceId,
      id: `${prefix}${safeId(sourceId)}`,
      type,
      name: attr(cell, 'value').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<\/(?:div|p)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      bounds: absoluteBounds(cell, cells),
    });
  });
  if (!nodes.length) throw new Error(`Aucun élément reconnu sur la page Draw.io ${pageIndex + 1}.`);

  const bySourceId = new Map(nodes.map(node => [node.sourceId, node]));
  const edges: EdgeInfo[] = [];
  cells.forEach(cell => {
    if (attr(cell, 'edge') !== '1') return;
    const sourceId = attr(cell, 'source');
    const targetId = attr(cell, 'target');
    const source = bySourceId.get(sourceId);
    const target = bySourceId.get(targetId);
    if (!source || !target) return;

    let kind: EdgeInfo['kind'];
    const sourceIsData = source.type === 'dataObjectReference' || source.type === 'dataStoreReference';
    const targetIsData = target.type === 'dataObjectReference' || target.type === 'dataStoreReference';
    if (sourceIsData && !targetIsData) kind = 'dataInputAssociation';
    else if (!sourceIsData && targetIsData) kind = 'dataOutputAssociation';
    else if (!sourceIsData && !targetIsData) kind = 'sequenceFlow';
    else {
      warnings.push(`Page ${pageIndex + 1} : connexion ignorée entre deux objets de données.`);
      return;
    }

    const geometry = Array.from(cell.children).find(child => child.localName === 'mxGeometry');
    const intermediate: Point[] = [];
    if (geometry) {
      geometry.querySelectorAll('Array > mxPoint').forEach(point => {
        intermediate.push({ x: numberAttr(point, 'x'), y: numberAttr(point, 'y') });
      });
      geometry.querySelectorAll(':scope > mxPoint').forEach(point => {
        intermediate.push({ x: numberAttr(point, 'x'), y: numberAttr(point, 'y') });
      });
    }
    const waypoints = [center(source.bounds), ...intermediate, center(target.bounds)];
    edges.push({
      id: `${prefix}${safeId(attr(cell, 'id') || `Edge_${edges.length + 1}`)}`,
      sourceId,
      targetId,
      kind,
      waypoints,
    });
  });

  const dataObjects = nodes.filter(node => node.type === 'dataObjectReference');
  const dataStores = nodes.filter(node => node.type === 'dataStoreReference');
  const processId = `Process_Page_${pageIndex + 1}`;
  const diagramId = `Diagram_Page_${pageIndex + 1}`;
  const planeId = `Plane_Page_${pageIndex + 1}`;

  const associationsByTask = new Map<string, EdgeInfo[]>();
  edges.filter(edge => edge.kind !== 'sequenceFlow').forEach(edge => {
    const taskId = edge.kind === 'dataInputAssociation' ? edge.targetId : edge.sourceId;
    const current = associationsByTask.get(taskId) ?? [];
    current.push(edge);
    associationsByTask.set(taskId, current);
  });

  const dataStoreDefinitions = dataStores.map(node =>
    `  <bpmn:dataStore id="${node.id}_store" name="${escapeXml(node.name || 'Data store')}" />`
  ).join('\n');

  const nodeElements = nodes.map(node => {
    const name = node.name ? ` name="${escapeXml(node.name)}"` : '';
    if (node.type === 'dataObjectReference') {
      return `    <bpmn:dataObject id="${node.id}_data" />\n    <bpmn:dataObjectReference id="${node.id}"${name} dataObjectRef="${node.id}_data" />`;
    }
    if (node.type === 'dataStoreReference') {
      return `    <bpmn:dataStoreReference id="${node.id}"${name} dataStoreRef="${node.id}_store" />`;
    }
    const attached = associationsByTask.get(node.sourceId) ?? [];
    const associationXml = attached.map(edge => {
      const dataId = edge.kind === 'dataInputAssociation' ? edge.sourceId : edge.targetId;
      const dataNode = bySourceId.get(dataId)!;
      if (edge.kind === 'dataInputAssociation') {
        const propertyId = `${edge.id}_property`;
        return `      <bpmn:property id="${propertyId}" name="__targetRef_placeholder" />\n      <bpmn:dataInputAssociation id="${edge.id}">\n        <bpmn:sourceRef>${dataNode.id}</bpmn:sourceRef>\n        <bpmn:targetRef>${propertyId}</bpmn:targetRef>\n      </bpmn:dataInputAssociation>`;
      }
      return `      <bpmn:dataOutputAssociation id="${edge.id}">\n        <bpmn:targetRef>${dataNode.id}</bpmn:targetRef>\n      </bpmn:dataOutputAssociation>`;
    }).join('\n');
    return associationXml
      ? `    <bpmn:${node.type} id="${node.id}"${name}>\n${associationXml}\n    </bpmn:${node.type}>`
      : `    <bpmn:${node.type} id="${node.id}"${name} />`;
  }).join('\n');

  const flowXml = edges.filter(edge => edge.kind === 'sequenceFlow').map(edge => {
    const source = bySourceId.get(edge.sourceId)!;
    const target = bySourceId.get(edge.targetId)!;
    return `    <bpmn:sequenceFlow id="${edge.id}" sourceRef="${source.id}" targetRef="${target.id}" />`;
  }).join('\n');

  const shapes = nodes.map(node =>
    `      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">\n        <dc:Bounds x="${node.bounds.x}" y="${node.bounds.y}" width="${node.bounds.width}" height="${node.bounds.height}" />\n      </bpmndi:BPMNShape>`
  ).join('\n');

  const diEdges = edges.map(edge =>
    `      <bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">\n${edge.waypoints.map(point => `        <di:waypoint x="${point.x}" y="${point.y}" />`).join('\n')}\n      </bpmndi:BPMNEdge>`
  ).join('\n');

  return {
    dataStores: dataStoreDefinitions,
    process: `  <bpmn:process id="${processId}" name="${escapeXml(page.name)}" isExecutable="false">\n${nodeElements}\n${flowXml}\n  </bpmn:process>`,
    diagram: `  <bpmndi:BPMNDiagram id="${diagramId}" name="${escapeXml(page.name)}">\n    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${processId}">\n${shapes}\n${diEdges}\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>`,
    dataObjectCount: dataObjects.length,
    dataStoreCount: dataStores.length,
  };
};

export async function drawioToBpmn(xml: string, pageName = 'Page-1'): Promise<DrawioImportResult> {
  const pageDocument = parseXml(xml, 'modèle de page Draw.io');
  if (pageDocument.documentElement.localName !== 'mxGraphModel') {
    throw new Error('Le convertisseur BPMN attend le modèle XML d’une seule page Draw.io. Le découpage du document multi-pages relève du moteur de lecture.');
  }
  const model = pageDocument.documentElement;

  const warnings: string[] = [];
  const converted = buildPage({ name: pageName, model }, 0, warnings);
  const resultXml = `<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:bpmn="${BPMN_NS}" xmlns:bpmndi="${BPMNDI_NS}" xmlns:dc="${DC_NS}" xmlns:di="${DI_NS}" id="Definitions_Drawio" targetNamespace="http://bpmn.io/schema/bpmn">\n${converted.dataStores}\n${converted.process}\n${converted.diagram}\n</bpmn:definitions>`;
  return { xml: resultXml, warnings };
}

export function isDrawioXml(xml: string): boolean {
  return /<mx(GraphModel|file|Cell)\b/i.test(xml);
}
