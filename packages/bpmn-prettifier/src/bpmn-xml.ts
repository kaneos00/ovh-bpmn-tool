import BpmnModdle from "bpmn-moddle";
import { prettifyDiagram, verifyDiagram } from "./engine.js";
import type { LayoutDiagram, LayoutLane, LayoutElement, PrettyficationResult, LayoutRuleOptions, VerificationResult } from "./model.js";

type AnyRecord = Record<string, any>;

export interface BpmnXmlPrettyficationResult {
  xml: string;
  layout: PrettyficationResult;
  warnings: string[];
}

export interface BpmnXmlVerificationResult extends VerificationResult {
  warnings: string[];
}

function idOf(value: any): string | undefined {
  return typeof value?.id === "string" ? value.id : undefined;
}

function shapeMap(definitions: AnyRecord): Map<string, AnyRecord> {
  const result = new Map<string, AnyRecord>();
  for (const diagram of definitions.diagrams ?? []) {
    for (const di of diagram.plane?.planeElement ?? []) {
      const id = idOf(di.bpmnElement);
      if (id && di.$type === "bpmndi:BPMNShape" && di.bounds) result.set(id, di);
    }
  }
  return result;
}

function getParticipants(definitions: AnyRecord): AnyRecord[] {
  return (definitions.rootElements ?? []).filter((element: AnyRecord) => element.$type === "bpmn:Collaboration")
    .flatMap((collaboration: AnyRecord) => collaboration.participants ?? []);
}

function semanticLaneNodes(lane: AnyRecord): AnyRecord[] {
  return (lane.flowNodeRef ?? []).filter((node: AnyRecord) => idOf(node));
}

function readLayout(definitions: AnyRecord): { layout: LayoutDiagram; shapes: Map<string, AnyRecord>; warnings: string[] } {
  const shapes = shapeMap(definitions);
  const participants = getParticipants(definitions);
  const lanes: LayoutLane[] = [];
  const elements: LayoutElement[] = [];
  const warnings: string[] = [];
  const laneIdByNode = new Map<string, string>();

  const processes = (definitions.rootElements ?? []).filter((element: AnyRecord) => element.$type === "bpmn:Process");
  for (const process of processes) {
    const participant = participants.find((candidate: AnyRecord) => candidate.processRef?.id === process.id);
    const participantId = idOf(participant) ?? process.id;
    const visitLane = (lane: AnyRecord, parentLaneId?: string) => {
      const shape = shapes.get(lane.id);
      if (shape?.bounds) {
        const bounds = shape.bounds;
        const orientation = bounds.width >= bounds.height ? "horizontal" : "vertical";
        lanes.push({ id: lane.id, participantId, parentLaneId, orientation, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
        for (const node of semanticLaneNodes(lane)) laneIdByNode.set(node.id, lane.id);
      } else {
        warnings.push(`Lane « ${lane.name ?? lane.id} » has no BPMN-DI bounds and was skipped.`);
      }
      for (const child of lane.childLaneSet?.lanes ?? []) visitLane(child, lane.id);
    };
    for (const laneSet of process.laneSets ?? []) {
      for (const lane of laneSet.lanes ?? []) visitLane(lane);
    }
  }

  for (const [id, shape] of shapes) {
    const semantic = shape.bpmnElement;
    const type = semantic?.$type ?? "";
    if (!shape.bounds || type === "bpmn:Participant" || type === "bpmn:Lane") continue;
    const bounds = shape.bounds;
    const normalizedBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    let laneId = laneIdByNode.get(id);
    // Some BPMN shapes (for example data references) are not represented in
    // Lane.flowNodeRef. Fall back to unambiguous geometric containment.
    if (!laneId) {
      const candidates = lanes.filter(lane =>
        normalizedBounds.x >= lane.bounds.x &&
        normalizedBounds.y >= lane.bounds.y &&
        normalizedBounds.x + normalizedBounds.width <= lane.bounds.x + lane.bounds.width &&
        normalizedBounds.y + normalizedBounds.height <= lane.bounds.y + lane.bounds.height
      ).sort((a, b) =>
        (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height)
      );
      if (candidates.length > 0) laneId = candidates[0]!.id;
    }
    elements.push({ id, kind: type, bounds: normalizedBounds, laneId, attachedToId: idOf(semantic?.attachedToRef), layoutLocked: Boolean(semantic?.attachedToRef) });
  }

  if (lanes.length === 0) warnings.push("No lane with BPMN-DI bounds found; lane-based rules will not run.");
  return { layout: { lanes, elements }, shapes, warnings };
}

function boundaryPoint(bounds: { x: number; y: number; width: number; height: number }, toward: { x: number; y: number }, shapeType = ""): { x: number; y: number } {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return { x: cx, y: cy };

  if (/Event$|Gateway$/.test(shapeType)) {
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    const denominator = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    const scale = denominator > 0 ? 1 / denominator : 0;
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  const tx = Math.abs(dx) > 0.0001 ? (bounds.width / 2) / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 0.0001 ? (bounds.height / 2) / Math.abs(dy) : Infinity;
  const scale = Math.min(tx, ty);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function updateEdgeEndpoints(definitions: AnyRecord, shapes: Map<string, AnyRecord>, warnings: string[]): void {
  for (const diagram of definitions.diagrams ?? []) {
    for (const di of diagram.plane?.planeElement ?? []) {
      if (di.$type !== "bpmndi:BPMNEdge" || !Array.isArray(di.waypoint) || di.waypoint.length < 2) continue;
      const semantic = di.bpmnElement;
      const sourceId = idOf(semantic?.sourceRef);
      const targetId = idOf(semantic?.targetRef);
      const sourceShape = sourceId ? shapes.get(sourceId) : undefined;
      const targetShape = targetId ? shapes.get(targetId) : undefined;
      if (!sourceShape?.bounds || !targetShape?.bounds) {
        if (sourceId || targetId) warnings.push(`Edge « ${semantic?.id ?? di.id ?? "unknown"} » has no DI bounds for one endpoint; its waypoints were left unchanged.`);
        continue;
      }
      const first = di.waypoint[0];
      const second = di.waypoint[1];
      const last = di.waypoint[di.waypoint.length - 1];
      const beforeLast = di.waypoint[di.waypoint.length - 2];
      const sourceToward = di.waypoint.length > 2 ? second : { x: targetShape.bounds.x + targetShape.bounds.width / 2, y: targetShape.bounds.y + targetShape.bounds.height / 2 };
      const targetToward = di.waypoint.length > 2 ? beforeLast : { x: sourceShape.bounds.x + sourceShape.bounds.width / 2, y: sourceShape.bounds.y + sourceShape.bounds.height / 2 };
      Object.assign(first, boundaryPoint(sourceShape.bounds, sourceToward, sourceShape.bpmnElement?.$type));
      Object.assign(last, boundaryPoint(targetShape.bounds, targetToward, targetShape.bpmnElement?.$type));
    }
  }
}

/**
 * Pretty-print BPMN-DI geometry while preserving the BPMN semantic model.
 * This first adapter intentionally edits only existing BPMNShape Bounds. It
 * does not reroute BPMNEdge waypoints, create missing DI shapes, or change XML semantics.
 */
export async function prettifyBpmnXml(xml: string, options: LayoutRuleOptions = {}): Promise<BpmnXmlPrettyficationResult> {
  const moddle = new BpmnModdle();
  const parsed = await moddle.fromXML(xml, "bpmn:Definitions");
  const definitions = parsed.rootElement as unknown as AnyRecord;
  const { layout, shapes, warnings } = readLayout(definitions);
  const result = prettifyDiagram(layout, options);
  for (const element of result.diagram.elements) {
    const shape = shapes.get(element.id);
    if (shape?.bounds) Object.assign(shape.bounds, element.bounds);
  }
  for (const lane of result.diagram.lanes) {
    const shape = shapes.get(lane.id);
    if (shape?.bounds) Object.assign(shape.bounds, lane.bounds);
  }
  updateEdgeEndpoints(definitions, shapes, warnings);
  const serialized = await moddle.toXML(definitions, { format: true });
  return {
    xml: serialized.xml,
    layout: result,
    warnings: [...warnings, ...(parsed.warnings ?? []).map((warning: AnyRecord) => warning.message ?? String(warning))]
  };
}

export async function verifyBpmnXml(xml: string): Promise<BpmnXmlVerificationResult> {
  const moddle = new BpmnModdle();
  const parsed = await moddle.fromXML(xml, "bpmn:Definitions");
  const { layout, warnings } = readLayout(parsed.rootElement as unknown as AnyRecord);
  const result = verifyDiagram(layout);
  return {
    ...result,
    warnings: [...warnings, ...(parsed.warnings ?? []).map((warning: AnyRecord) => warning.message ?? String(warning))]
  };
}
