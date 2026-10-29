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
      const key = `${lane.participantId}::${lane.parentLaneId ?? ""}::${lane.orientation}`;
      const group = groups.get(key) ?? [];
      group.push(lane);
      groups.set(key, group);
    }

    const childrenByParent = new Map<string, LayoutLane[]>();
    for (const lane of diagram.lanes) {
      if (!lane.parentLaneId) continue;
      const children = childrenByParent.get(lane.parentLaneId) ?? [];
      children.push(lane);
      childrenByParent.set(lane.parentLaneId, children);
    }

    const shiftLaneSubtree = (root: LayoutLane, delta: number, horizontal: boolean) => {
      if (Math.abs(delta) < EPSILON) return;
      const pending = [root.id];
      const subtree = new Set<string>();
      while (pending.length) {
        const parentId = pending.pop()!;
        if (subtree.has(parentId)) continue;
        subtree.add(parentId);
        for (const child of childrenByParent.get(parentId) ?? []) pending.push(child.id);
      }
      for (const lane of diagram.lanes) {
        if (!subtree.has(lane.id) || lane.id === root.id) continue;
        if (horizontal) lane.bounds.y += delta;
        else lane.bounds.x += delta;
      }
      for (const element of diagram.elements) {
        if (!element.laneId || !subtree.has(element.laneId)) continue;
        if (horizontal) element.bounds.y += delta;
        else element.bounds.x += delta;
      }
    };

    // Keep nested lane sets fitted to a resized parent when their direct
    // children form a contiguous partition of the parent's cross-axis bounds.
    // Uneven/incomplete child layouts are left untouched rather than guessed.
    const resizeNestedLanes = (parent: LayoutLane, newSize: number, seen = new Set<string>()): void => {
      if (seen.has(parent.id)) return;
      seen.add(parent.id);
      const horizontal = parent.orientation === "horizontal";
      const start = (lane: LayoutLane) => horizontal ? lane.bounds.y : lane.bounds.x;
      const size = (lane: LayoutLane) => horizontal ? lane.bounds.height : lane.bounds.width;
      const children = (childrenByParent.get(parent.id) ?? [])
        .filter(child => child.orientation === parent.orientation)
        .sort((a, b) => start(a) - start(b));
      if (children.length === 0 || size(parent) <= EPSILON) return;
      const parentStart = start(parent);
      const parentEnd = parentStart + size(parent);
      const contiguous = Math.abs(start(children[0]!) - parentStart) < EPSILON &&
        Math.abs(start(children[children.length - 1]!) + size(children[children.length - 1]!) - parentEnd) < EPSILON &&
        children.every((child, index) => index === 0 ||
          Math.abs(start(child) - (start(children[index - 1]!) + size(children[index - 1]!))) < EPSILON);
      if (!contiguous) return;

      const childSize = newSize / children.length;
      let cursor = parentStart;
      for (const child of children) {
        const delta = cursor - start(child);
        if (Math.abs(delta) >= EPSILON) shiftLaneSubtree(child, delta, horizontal);
        if (horizontal) {
          child.bounds.y = cursor;
          child.bounds.height = childSize;
        } else {
          child.bounds.x = cursor;
          child.bounds.width = childSize;
        }
        resizeNestedLanes(child, childSize, seen);
        cursor += childSize;
      }
    };

    for (const lanes of groups.values()) {
      if (lanes.length < 2) continue;
      const horizontal = lanes[0]!.orientation === "horizontal";
      const axisStart = (lane: LayoutLane) => horizontal ? lane.bounds.y : lane.bounds.x;
      const axisSize = (lane: LayoutLane) => horizontal ? lane.bounds.height : lane.bounds.width;
      const ordered = [...lanes].sort((a, b) => axisStart(a) - axisStart(b));
      const target = Math.max(...ordered.map(axisSize));
      const proposed = ordered.map((lane, index) => {
        const precedingDelta = ordered.slice(0, index).reduce((sum, previous) => sum + target - axisSize(previous), 0);
        return { lane, shift: precedingDelta, sizeDelta: target - axisSize(lane) };
      });
      const exceedsLimit = proposed.some(item =>
        Math.abs(item.shift) > maxDisplacement || Math.abs(item.sizeDelta) > maxDisplacement
      );
      if (exceedsLimit) {
        diagnostics.push({
          code: "LAYOUT_MAX_DISPLACEMENT",
          severity: "warning",
          message: "Lane equalization skipped because resizing or reflow would exceed maxDisplacement.",
          elementIds: [],
          laneId: ordered[0]!.id
        });
        continue;
      }

      for (const item of proposed) {
        const { lane, shift, sizeDelta } = item;
        if (Math.abs(shift) >= EPSILON) {
          shiftLaneSubtree(lane, shift, horizontal);
          if (horizontal) lane.bounds.y += shift;
          else lane.bounds.x += shift;
        }
        if (Math.abs(sizeDelta) >= EPSILON) {
          resizeNestedLanes(lane, target);
          if (horizontal) lane.bounds.height = target;
          else lane.bounds.width = target;
        }
        if (Math.abs(shift) >= EPSILON || Math.abs(sizeDelta) >= EPSILON) {
          appliedRules.push("LANE_CROSS_AXIS_SIZE_EQUALIZED");
          appliedRules.push("LANE_SIBLINGS_REFLOWED");
        }
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
      // Boundary events are locked as independent layout targets, but must follow
      // their host activity whenever that activity is moved by an alignment rule.
      const attachedProposals = proposals.flatMap(host => diagram.elements
        .filter(element => element.attachedToId === host.element.id)
        .map(element => ({
          element,
          next: {
            ...element.bounds,
            x: element.bounds.x + host.next.x - host.element.bounds.x,
            y: element.bounds.y + host.next.y - host.element.bounds.y
          }
        })));
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
      for (const p of attachedProposals) p.element.bounds = p.next;
      appliedRules.push(horizontal ? "LANE_ELEMENTS_ALIGN_CENTER_Y" : "LANE_ELEMENTS_ALIGN_CENTER_X");
    }
  }

  diagnostics.push(...verifyDiagram(diagram).diagnostics.filter(d => d.code === "ELEMENT_OUTSIDE_LANE" || d.code === "ELEMENT_OVERLAP"));
  return { diagram, appliedRules: [...new Set(appliedRules)], diagnostics };
}

export function verifyDiagram(diagram: LayoutDiagram): VerificationResult {
  const diagnostics: LayoutDiagnostic[] = [];
  const ids = new Set<string>();
  const lanesById = new Map(diagram.lanes.map(lane => [lane.id, lane]));
  for (const lane of diagram.lanes) {
    if (ids.has(lane.id)) diagnostics.push({ code: "DUPLICATE_ID", severity: "error", message: "Duplicate ID: " + lane.id, elementIds: [], laneId: lane.id });
    ids.add(lane.id);
    if (!validBounds(lane.bounds)) diagnostics.push({ code: "INVALID_BOUNDS", severity: "error", message: "Invalid bounds for lane " + lane.id, elementIds: [], laneId: lane.id });
    if (lane.parentLaneId && !lanesById.has(lane.parentLaneId)) {
      diagnostics.push({ code: "PARENT_LANE_NOT_FOUND", severity: "error", message: "Parent lane " + lane.parentLaneId + " not found for lane " + lane.id, elementIds: [], laneId: lane.id });
    }
  }
  // Reject cyclic lane hierarchies: subtree reflow must have a well-defined root.
  const reportedCycles = new Set<string>();
  for (const lane of diagram.lanes) {
    const path = new Set<string>();
    let current: LayoutLane | undefined = lane;
    while (current?.parentLaneId && lanesById.has(current.parentLaneId)) {
      if (path.has(current.id)) {
        if (!reportedCycles.has(current.id)) {
          diagnostics.push({ code: "LANE_HIERARCHY_CYCLE", severity: "error", message: "Cycle detected in lane hierarchy at " + current.id, elementIds: [], laneId: current.id });
          reportedCycles.add(current.id);
        }
        break;
      }
      path.add(current.id);
      current = lanesById.get(current.parentLaneId);
    }
    if (current && path.has(current.id) && !reportedCycles.has(current.id)) {
      diagnostics.push({ code: "LANE_HIERARCHY_CYCLE", severity: "error", message: "Cycle detected in lane hierarchy at " + current.id, elementIds: [], laneId: current.id });
      reportedCycles.add(current.id);
    }
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
      const intentionalAttachment = a.attachedToId === b.id || b.attachedToId === a.id;
      if (!intentionalAttachment && validBounds(a.bounds) && validBounds(b.bounds) && intersects(a.bounds, b.bounds)) diagnostics.push({
        code: "ELEMENT_OVERLAP", severity: "warning", message: "Elements " + a.id + " and " + b.id + " overlap.", elementIds: [a.id, b.id]
      });
    }
  }
  return { diagnostics, valid: !diagnostics.some(d => d.severity === "error") };
}
