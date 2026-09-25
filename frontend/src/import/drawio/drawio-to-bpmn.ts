export type DrawioImportResult = {
  xml: string;
  warnings: string[];
};

type Bounds = { x: number; y: number; width: number; height: number };

type NodeInfo = {
  id: string;
  type: string;
  name: string;
  bounds: Bounds;
  parent?: string;
};

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const attr = (element: Element, name: string) =>
  element.getAttribute(name) ?? '';

const numberAttr = (element: Element, name: string, fallback = 0) => {
  const value = Number.parseFloat(attr(element, name));
  return Number.isFinite(value) ? value : fallback;
};

const absoluteBounds = (
  cell: Element,
  cells: Map<string, Element>,
): Bounds => {
  let x = 0;
  let y = 0;
  let current: Element | undefined = cell;
  let width = 100;
  let height = 80;

  while (current) {
    const geometry = Array.from(current.children).find(
      child => child.localName === 'mxGeometry',
    );
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

const bpmnTypeFromStyle = (style: string): string | undefined => {
  const normalized = style.toLowerCase();

  if (normalized.includes('subprocess')) return 'bpmn:subProcess';
  if (normalized.includes('callactivity')) return 'bpmn:callActivity';
  if (normalized.includes('gateway')) {
    if (normalized.includes('parallel')) return 'bpmn:parallelGateway';
    if (normalized.includes('inclusive')) return 'bpmn:inclusiveGateway';
    return 'bpmn:exclusiveGateway';
  }
  if (normalized.includes('event')) {
    if (normalized.includes('end')) return 'bpmn:endEvent';
    if (normalized.includes('intermediate')) return 'bpmn:intermediateCatchEvent';
    return 'bpmn:startEvent';
  }
  if (normalized.includes('task')) return 'bpmn:task';
  if (normalized.includes('pool') || normalized.includes('participant'))
    return 'bpmn:participant';
  if (normalized.includes('lane')) return 'bpmn:lane';

  return undefined;
};

const eventType = (style: string) => {
  const normalized = style.toLowerCase();
  if (
    normalized.includes('endevent') ||
    normalized.includes('end_event') ||
    normalized.includes('end')
  ) {
    return 'bpmn:endEvent';
  }
  if (
    normalized.includes('intermediate') ||
    normalized.includes('intermediateevent') ||
    normalized.includes('intermediate_event')
  ) {
    return 'bpmn:intermediateCatchEvent';
  }
  return 'bpmn:startEvent';
};

const gatewayType = (style: string) => {
  const normalized = style.toLowerCase();
  if (
    normalized.includes('parallel') ||
    normalized.includes('parallelgateway') ||
    normalized.includes('parallel_gateway')
  ) {
    return 'bpmn:parallelGateway';
  }
  if (
    normalized.includes('inclusive') ||
    normalized.includes('inclusivegateway') ||
    normalized.includes('inclusive_gateway')
  ) {
    return 'bpmn:inclusiveGateway';
  }
  return 'bpmn:exclusiveGateway';
};

const elementTag = (type: string) => type;

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

const inflateRaw = async (value: string): Promise<string> => {
  let bytes: Uint8Array;

  try {
    bytes = decodeBase64(value.trim());
  } catch {
    const encoded = decodeURIComponent(value);
    bytes = Uint8Array.from(encoded, char => char.charCodeAt(0));
  }

  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buffer);
};

const getMxGraphModel = async (xml: string): Promise<Document> => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) throw new Error('Le fichier Draw.io est un XML invalide.');

  const directModel = document.querySelector('mxGraphModel');
  if (directModel) return document;

  const diagram = document.querySelector('mxfile > diagram');
  if (!diagram) throw new Error('Le fichier ne contient pas de diagramme Draw.io.');

  const content = diagram.textContent?.trim() ?? '';
  if (!content) throw new Error('Le diagramme Draw.io est vide.');

  const decoded = content.startsWith('<mxGraphModel')
    ? content
    : await inflateRaw(content);
  const modelDocument = new DOMParser().parseFromString(decoded, 'application/xml');
  if (modelDocument.querySelector('parsererror') || !modelDocument.querySelector('mxGraphModel')) {
    throw new Error('Impossible de décoder le diagramme Draw.io compressé.');
  }
  return modelDocument;
};

export async function drawioToBpmn(xml: string): Promise<DrawioImportResult> {
  const document = await getMxGraphModel(xml);
  const model = document.querySelector('mxGraphModel');
  if (!model) {
    throw new Error('Le fichier ne contient pas de mxGraphModel Draw.io.');
  }

  const cells = new Map<string, Element>();
  model.querySelectorAll('mxCell').forEach(cell => {
    const id = attr(cell, 'id');
    if (id) cells.set(id, cell);
  });

  const warnings: string[] = [];
  const nodes: NodeInfo[] = [];

  cells.forEach(cell => {
    if (attr(cell, 'vertex') !== '1') return;

    const style = attr(cell, 'style');
    let type = bpmnTypeFromStyle(style);
    if (!type) return;

    if (type === 'bpmn:startEvent' || type === 'bpmn:endEvent') {
      type = eventType(style);
    }
    if (
      type === 'bpmn:exclusiveGateway' ||
      type === 'bpmn:parallelGateway' ||
      type === 'bpmn:inclusiveGateway'
    ) {
      type = gatewayType(style);
    }

    const id = attr(cell, 'id');
    const parent = attr(cell, 'parent');
    const name = attr(cell, 'value').trim();
    nodes.push({
      id,
      type,
      name,
      bounds: absoluteBounds(cell, cells),
      parent,
    });
  });

  if (!nodes.length) {
    throw new Error(
      'Aucun élément BPMN Draw.io reconnu. Utilisez les formes BPMN de Draw.io.',
    );
  }

  const nodeIds = new Set(nodes.map(node => node.id));
  const flows: Array<{
    id: string;
    type: 'sequenceFlow' | 'messageFlow';
    source: string;
    target: string;
    waypoints: Array<{ x: number; y: number }>;
  }> = [];

  cells.forEach(cell => {
    if (attr(cell, 'edge') !== '1') return;
    const source = attr(cell, 'source');
    const target = attr(cell, 'target');
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;

    const style = attr(cell, 'style').toLowerCase();
    const type = style.includes('message') ? 'messageFlow' : 'sequenceFlow';
    const geometry = Array.from(cell.children).find(
      child => child.localName === 'mxGeometry',
    );

    const waypoints: Array<{ x: number; y: number }> = [];
    if (geometry) {
      geometry.querySelectorAll('Array > mxPoint, mxPoint').forEach(point => {
        waypoints.push({
          x: numberAttr(point, 'x'),
          y: numberAttr(point, 'y'),
        });
      });
    }

    flows.push({
      id: attr(cell, 'id') || `Flow_${flows.length + 1}`,
      type,
      source,
      target,
      waypoints,
    });
  });

  const processNodes = nodes.filter(
    node => node.type !== 'bpmn:participant' && node.type !== 'bpmn:lane',
  );

  const processElementIds = new Set(processNodes.map(node => node.id));
  const laneNodes = nodes.filter(node => node.type === 'bpmn:lane');

  const processXml = processNodes
    .map(node => {
      const tag = elementTag(node.type);
      const name = node.name ? ` name="${escapeXml(node.name)}"` : '';
      return `    <${tag} id="${escapeXml(node.id)}"${name}/>`;
    })
    .join('\n');

  const laneSetXml = laneNodes.length
    ? `    <bpmn:laneSet id="LaneSet_1">
${laneNodes
  .map(
    lane =>
      `      <bpmn:lane id="${escapeXml(lane.id)}"${lane.name ? ` name="${escapeXml(lane.name)}"` : ''}>${processNodes
        .filter(node => node.parent === lane.id)
        .map(node => `<bpmn:flowNodeRef>${escapeXml(node.id)}</bpmn:flowNodeRef>`)
        .join('')}</bpmn:lane>`,
  )
  .join('\n')}
    </bpmn:laneSet>`
    : '';

  const flowXml = flows
    .filter(
      flow =>
        flow.type === 'sequenceFlow' &&
        processElementIds.has(flow.source) &&
        processElementIds.has(flow.target),
    )
    .map(
      flow =>
        `    <bpmn:sequenceFlow id="${escapeXml(flow.id)}" sourceRef="${escapeXml(flow.source)}" targetRef="${escapeXml(flow.target)}"/>`,
    )
    .join('\n');

  const participantNodes = nodes.filter(
    node => node.type === 'bpmn:participant',
  );

  if (participantNodes.length) {
    warnings.push(
      'Les pools Draw.io sont importés comme participants. Le rattachement automatique des lanes et des processus sera complété dans une prochaine étape.',
    );
  }

  if (laneNodes.length) {
    warnings.push(
      'Les lanes Draw.io sont détectées mais leur rattachement BPMN reste volontairement conservateur dans cette première version.',
    );
  }

  const shapes = nodes
    .map(
      node => `    <bpmndi:BPMNShape id="${escapeXml(node.id)}_di" bpmnElement="${escapeXml(node.id)}">
      <dc:Bounds x="${node.bounds.x}" y="${node.bounds.y}" width="${node.bounds.width}" height="${node.bounds.height}"/>
    </bpmndi:BPMNShape>`,
    )
    .join('\n');

  const edges = flows
    .map(flow => {
      const source = nodes.find(node => node.id === flow.source)!;
      const target = nodes.find(node => node.id === flow.target)!;
      const points =
        flow.waypoints.length >= 2
          ? flow.waypoints
          : [
              {
                x: source.bounds.x + source.bounds.width / 2,
                y: source.bounds.y + source.bounds.height / 2,
              },
              {
                x: target.bounds.x + target.bounds.width / 2,
                y: target.bounds.y + target.bounds.height / 2,
              },
            ];
      return `    <bpmndi:BPMNEdge id="${escapeXml(flow.id)}_di" bpmnElement="${escapeXml(flow.id)}">
${points.map(point => `      <di:waypoint x="${point.x}" y="${point.y}"/>`).join('\n')}
    </bpmndi:BPMNEdge>`;
    })
    .join('\n');

  const collaboration =
    participantNodes.length > 0
      ? `\n  <bpmn:collaboration id="Collaboration_1">
${participantNodes
  .map(
    participant =>
      `    <bpmn:participant id="${escapeXml(participant.id)}" name="${escapeXml(participant.name || 'Pool')}" processRef="Process_1"/>`,
  )
  .join('\n')}
${flows
  .filter(flow => flow.type === 'messageFlow')
  .map(
    flow =>
      `    <bpmn:messageFlow id="${escapeXml(flow.id)}" sourceRef="${escapeXml(flow.source)}" targetRef="${escapeXml(flow.target)}"/>`,
  )
  .join('\n')}
  </bpmn:collaboration>`
      : '';

  const planeElement = participantNodes.length
    ? 'Collaboration_1'
    : 'Process_1';

  return {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="${BPMN_NS}" xmlns:bpmndi="${BPMNDI_NS}" xmlns:dc="${DC_NS}" xmlns:di="${DI_NS}" id="Definitions_Drawio" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
${laneSetXml}
${processXml}
${flowXml}
  </bpmn:process>${collaboration}
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${planeElement}">
${shapes}
${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
    warnings,
  };
}

export function isDrawioXml(xml: string): boolean {
  return /<mx(GraphModel|file|Cell)\b/i.test(xml);
}
