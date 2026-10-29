import type { LayoutDiagram, LayoutElement, LayoutLane, LayoutRuleOptions, PrettyficationResult, VerificationResult, LayoutDiagnostic } from "./model.js";
import { centerX, centerY, intersects } from "./geometry.js";

const EPSILON = 0.001;

function cloneDiagram(input: LayoutDiagram): LayoutDiagram {
  return {
    lanes: input.lanes.map(lane => ({ ...lane, bounds: { ...lane.bounds } })),
    elements: input.elements.map(element => ({ ...element, bounds: { ...element.bounds } }))
  };
}

function validBounds(b: { x: number; y: number; width: number; height: number }): boolean {
  return [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0;
}

function outsideLane(element: LayoutElement, lane: LayoutLane): boolean {
  const b = element.bounds, l = lane.bounds;
  return b.x < l.x - EPSILON || b.y < l.y - EPSILON ||
    b.x + b.width > l.x + l.width + EPSILON ||
    b.y + b.height > l.y + l.height + EPSILON;
}

export function prettifyDiagram(input: LayoutDiagram, options: LayoutRuleOptions = {}): PrettyficationResult {
  const diagram = cloneDiagram(input);
  const diagnostics = verifyDiagram(diagram).diagnostics;
  const appliedRules: string[] = [];
  const maxDisplacement = options.maxDisplacement ?? Infinity;

  if (options.equalizeLaneCrossAxisSize !== false) {
    const groups = new Map<string, LayoutLane[]>();
    for (const lane of diagram.lanes) {
      const group = groups.get(lane.participantId) ?? [];
      group.push(lane);
      groups.set(lane.participantId, group);
    }
    for (const lanes of groups.values()) {
      if (lanes.length < 2 || lanes.some(lane => lane.orientation !== lanes[0]!.orientation)) continue;
      const horizontal = lanes[0]!.orientation === "horizontal";
      const target = Math.max(...lanes.map(lane => horizontal ? lane.bounds.height : lane.bounds.width));
      for (const lane of lanes) {
        const current = horizontal ? lane.bounds.height : lane.bounds.width;
        if (Math.abs(target - current) < EPSILON) continue;
        if (target - current > maxDisplacement) {
          diagnostics.push({ code: "LAYOUT_MAX_DISPLACEMENT", severity: "warning", message: "Lane size adjustment exceeds maxDisplacement.", elementIds: [], laneId: lane.id });
          continue;
        }
        const proposedBounds = { ...lane.bounds, ...(horizontal ? { height: target } : { width: target }) };
        const wouldOverlapLane = lanes.some(other =>
          other.id !== lane.id && intersects(proposedBounds, other.bounds)
        );
        if (wouldOverlapLane) {
          diagnostics.push({
            code: "LANE_SIZE_WOULD_OVERLAP",
            severity: "warning",
            message: "Lane size adjustment skipped because it would overlap another lane. Reflow of sibling lanes is not implemented yet.",
            elementIds: [],
            laneId: lane.id
          });
          continue;
        }
        if (horizontal) lane.bounds.height = target;
        else lane.bounds.width = target;
        appliedRules.push("LANE_CROSS_AXIS_SIZE_EQUALIZED");
      }
    }
  }

  if (options.alignElements !== false) {
    for (const lane of diagram.lanes) {
      const members = diagram.elements.filter(e => e.laneId === lane.id && !e.layoutLocked);
      if (members.length < 2) continue;
      const horizontal = lane.orientation === "horizontal";
      const target = horizontal
        ? members.reduce((sum, e) => sum + centerY(e.bounds), 0) / members.length
        : members.reduce((sum, e) => sum + centerX(e.bounds), 0) / members.length;
      const proposals = members.map(element => {
        const next = { ...element.bounds };
        if (horizontal) next.y = target - next.height / 2;
        else next.x = target - next.width / 2;
        return { element, next, movement: horizontal ? Math.abs(next.y - element.bounds.y) : Math.abs(next.x - element.bounds.x) };
      });
      const tooFar = proposals.some(p => p.movement > maxDisplacement);
      const overlap = options.preventNewOverlaps !== false && proposals.some((p, i) =>
        proposals.some((q, j) => j > i && intersects(p.next, q.next)));
      if (tooFar || overlap) {
        diagnostics.push({
          code: tooFar ? "LAYOUT_MAX_DISPLACEMENT" : "LAYOUT_ALIGNMENT_WOULD_OVERLAP",
          severity: "warning",
          message: tooFar ? "Alignment skipped: maximum displacement exceeded." : "Alignment skipped: it would introduce an overlap.",
          elementIds: members.map(e => e.id), laneId: lane.id
        });
        continue;
      }
      for (const p of proposals) p.element.bounds = p.next;
      appliedRules.push(horizontal ? "LANE_ELEMENTS_ALIGN_CENTER_Y" : "LANE_ELEMENTS_ALIGN_CENTER_X");
    }
  }

  diagnostics.push(...verifyDiagram(diagram).diagnostics.filter(d => d.code === "ELEMENT_OUTSIDE_LANE" || d.code === "ELEMENT_OVERLAP"));
  return { diagram, appliedRules: [...new Set(appliedRules)], diagnostics };
}

export function verifyDiagram(diagram: LayoutDiagram): VerificationResult {
  const diagnostics: LayoutDiagnostic[] = [];
  const ids = new Set<string>();
  for (const lane of diagram.lanes) {
    if (ids.has(lane.id)) diagnostics.push({ code: "DUPLICATE_ID", severity: "error", message: "Duplicate ID: " + lane.id, elementIds: [], laneId: lane.id });
    ids.add(lane.id);
    if (!validBounds(lane.bounds)) diagnostics.push({ code: "INVALID_BOUNDS", severity: "error", message: "Invalid bounds for lane " + lane.id, elementIds: [], laneId: lane.id });
  }
  for (const element of diagram.elements) {
    if (ids.has(element.id)) diagnostics.push({ code: "DUPLICATE_ID", severity: "error", message: "Duplicate ID: " + element.id, elementIds: [element.id] });
    ids.add(element.id);
    if (!validBounds(element.bounds)) diagnostics.push({ code: "INVALID_BOUNDS", severity: "error", message: "Invalid bounds for element " + element.id, elementIds: [element.id] });
    const lane = diagram.lanes.find(candidate => candidate.id === element.laneId);
    if (element.laneId && !lane) diagnostics.push({ code: "LANE_NOT_FOUND", severity: "error", message: "Lane " + element.laneId + " not found for element " + element.id, elementIds: [element.id], laneId: element.laneId });
    else if (lane && validBounds(element.bounds) && outsideLane(element, lane)) diagnostics.push({ code: "ELEMENT_OUTSIDE_LANE", severity: "warning", message: "Element " + element.id + " extends beyond lane " + lane.id, elementIds: [element.id], laneId: lane.id });
  }
  for (let i = 0; i < diagram.elements.length; i++) {
    const a = diagram.elements[i]!;
    for (let j = i + 1; j < diagram.elements.length; j++) {
      const b = diagram.elements[j]!;
      if (validBounds(a.bounds) && validBounds(b.bounds) && intersects(a.bounds, b.bounds)) diagnostics.push({
        code: "ELEMENT_OVERLAP", severity: "warning", message: "Elements " + a.id + " and " + b.id + " overlap.", elementIds: [a.id, b.id]
      });
    }
  }
  return { diagnostics, valid: !diagnostics.some(d => d.severity === "error") };
}
