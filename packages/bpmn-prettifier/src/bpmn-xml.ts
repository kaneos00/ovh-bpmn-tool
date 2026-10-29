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
    const visitLane = (lane: AnyRecord) => {
      const shape = shapes.get(lane.id);
      if (shape?.bounds) {
        const bounds = shape.bounds;
        const orientation = bounds.width >= bounds.height ? "horizontal" : "vertical";
        lanes.push({ id: lane.id, participantId, orientation, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
        for (const node of semanticLaneNodes(lane)) laneIdByNode.set(node.id, lane.id);
      } else {
        warnings.push(`Lane « ${lane.name ?? lane.id} » has no BPMN-DI bounds and was skipped.`);
      }
      for (const child of lane.childLaneSet?.lanes ?? []) visitLane(child);
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
    elements.push({
      id,
      kind: type,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      laneId: laneIdByNode.get(id)
    });
  }

  if (lanes.length === 0) warnings.push("No lane with BPMN-DI bounds found; lane-based rules will not run.");
  return { layout: { lanes, elements }, shapes, warnings };
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
