import BpmnModdle from "bpmn-moddle";
import { prettifyBpmnXml } from "./bpmn-xml.js";
import type { LaneOrientation, LayoutRuleOptions, PrettyficationResult } from "./model.js";

type AnyRecord = Record<string, any>;

export interface BpmnOrientationConversionResult {
  xml: string;
  sourceOrientation: LaneOrientation;
  targetOrientation: LaneOrientation;
  layout: PrettyficationResult;
  warnings: string[];
}

interface Point { x: number; y: number }
interface Bounds { x: number; y: number; width: number; height: number }

function isBounds(value: any): value is Bounds {
  return value && Number.isFinite(value.x) && Number.isFinite(value.y) &&
    Number.isFinite(value.width) && Number.isFinite(value.height);
}

function isPoint(value: any): value is Point {
  return value && Number.isFinite(value.x) && Number.isFinite(value.y) &&
    !("width" in value) && !("height" in value);
}

function collectDiGeometry(planeElements: AnyRecord[]): { bounds: Bounds[]; points: Point[] } {
  const bounds: Bounds[] = [];
  const points: Point[] = [];
  const seen = new Set<object>();

  const visit = (value: any): void => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (isBounds(value.bounds)) bounds.push(value.bounds);
    if (Array.isArray(value.waypoint)) {
      for (const point of value.waypoint) if (isPoint(point)) points.push(point);
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "bpmnElement" || key === "bounds" || key === "waypoint" || key.startsWith("$")) continue;
      visit(child);
    }
  };

  visit(planeElements);
  return { bounds, points };
}

function detectOrientation(planeElements: AnyRecord[]): LaneOrientation {
  const laneBounds = planeElements
    .filter(di => di.$type === "bpmndi:BPMNShape" && di.bpmnElement?.$type === "bpmn:Lane" && isBounds(di.bounds))
    .map(di => di.bounds as Bounds);
  if (laneBounds.length === 0) {
    throw new Error("Cannot convert lane orientation: no BPMN lane shapes with DI bounds were found.");
  }

  let horizontal = 0;
  let vertical = 0;
  for (const bounds of laneBounds) {
    if (bounds.width > bounds.height) horizontal++;
    else if (bounds.height > bounds.width) vertical++;
  }
  if (horizontal === 0 && vertical === 0) {
    throw new Error("Cannot determine lane orientation: all lane bounds are square.");
  }
  if (horizontal > 0 && vertical > 0 && horizontal === vertical) {
    throw new Error("Cannot determine lane orientation reliably: horizontal and vertical lane bounds are equally represented.");
  }
  return horizontal > vertical ? "horizontal" : "vertical";
}

/**
 * Converts the BPMN-DI layout by rotating shape centers and edge waypoints by
 * 90 degrees. BPMN semantic objects and references are never modified. Lane
 * and participant rectangles swap width/height; task/event/gateway shapes keep
 * their own dimensions so BPMN activities remain legible.
 */
function rotateDiGeometry(planeElements: AnyRecord[], source: LaneOrientation): void {
  const geometry = collectDiGeometry(planeElements);
  const allX = [
    ...geometry.bounds.flatMap(b => [b.x, b.x + b.width]),
    ...geometry.points.map(p => p.x)
  ];
  const allY = [
    ...geometry.bounds.flatMap(b => [b.y, b.y + b.height]),
    ...geometry.points.map(p => p.y)
  ];
  if (allX.length === 0 || allY.length === 0) {
    throw new Error("Cannot convert lane orientation: the BPMN diagram has no usable DI geometry.");
  }
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const rotatePoint = (point: Point): Point => source === "horizontal"
    ? { x: minX + (point.y - minY), y: minY + (maxX - point.x) }
    : { x: minX + (maxY - point.y), y: minY + (point.x - minX) };

  const seen = new Set<object>();
  const visit = (value: any): void => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    if (isBounds(value.bounds)) {
      const bounds = value.bounds as Bounds;
      const oldCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const nextCenter = rotatePoint(oldCenter);
      const isLaneOrParticipant = value.$type === "bpmndi:BPMNShape" &&
        (value.bpmnElement?.$type === "bpmn:Lane" || value.bpmnElement?.$type === "bpmn:Participant");
      const width = isLaneOrParticipant ? bounds.height : bounds.width;
      const height = isLaneOrParticipant ? bounds.width : bounds.height;
      Object.assign(bounds, { x: nextCenter.x - width / 2, y: nextCenter.y - height / 2, width, height });
      if (isLaneOrParticipant) {
        // BPMN-DI uses this flag alongside the bounds to indicate lane/pool orientation.
        value.isHorizontal = source === "vertical";
      }
    }

    if (Array.isArray(value.waypoint)) {
      for (const point of value.waypoint) {
        if (!isPoint(point)) continue;
        Object.assign(point, rotatePoint(point));
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === "bpmnElement" || key === "bounds" || key === "waypoint" || key.startsWith("$")) continue;
      visit(child);
    }
  };
  visit(planeElements);
}

/**
 * Convert horizontal lanes to vertical lanes or vice versa, then run the V1
 * prettification engine on the converted BPMN XML. This is a standalone engine
 * API; it does not integrate with or invoke any frontend code.
 */
export async function convertBpmnLaneOrientation(
  xml: string,
  targetOrientation: LaneOrientation,
  options: LayoutRuleOptions = {}
): Promise<BpmnOrientationConversionResult> {
  const moddle = new BpmnModdle();
  const parsed = await moddle.fromXML(xml, "bpmn:Definitions");
  const definitions = parsed.rootElement as unknown as AnyRecord;
  const diagrams = definitions.diagrams ?? [];
  const planeElements: AnyRecord[] = diagrams.flatMap((diagram: AnyRecord) => diagram.plane?.planeElement ?? []);
  const sourceOrientation = detectOrientation(planeElements);
  const warnings = (parsed.warnings ?? []).map((warning: AnyRecord) => warning.message ?? String(warning));

  let sourceXml = xml;
  if (sourceOrientation !== targetOrientation) {
    rotateDiGeometry(planeElements, sourceOrientation);
    const serialized = await moddle.toXML(definitions, { format: true });
    sourceXml = serialized.xml;
  }

  const prettified = await prettifyBpmnXml(sourceXml, options);
  return {
    ...prettified,
    sourceOrientation,
    targetOrientation,
    warnings: [...warnings, ...prettified.warnings]
  };
}
