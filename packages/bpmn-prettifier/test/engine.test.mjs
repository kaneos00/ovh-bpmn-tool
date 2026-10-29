import test from "node:test";
import assert from "node:assert/strict";
import { prettifyDiagram, verifyDiagram } from "../dist/index.js";

const sample = () => ({
  lanes: [
    { id: "lane-a", participantId: "pool-1", orientation: "horizontal", bounds: { x: 0, y: 0, width: 600, height: 100 } },
    { id: "lane-b", participantId: "pool-1", orientation: "horizontal", bounds: { x: 0, y: 300, width: 600, height: 140 } }
  ],
  elements: [
    { id: "task-a", kind: "task", laneId: "lane-a", bounds: { x: 50, y: 20, width: 100, height: 40 } },
    { id: "task-b", kind: "task", laneId: "lane-a", bounds: { x: 200, y: 40, width: 100, height: 40 } }
  ]
});

test("aligns elements in horizontal lanes and equalizes lane heights", () => {
  const result = prettifyDiagram(sample());
  const [a, b] = result.diagram.elements;
  assert.equal(a.bounds.y + a.bounds.height / 2, b.bounds.y + b.bounds.height / 2);
  assert.equal(result.diagram.lanes[0].bounds.height, result.diagram.lanes[1].bounds.height);
});

test("does not mutate input", () => {
  const input = sample();
  const before = structuredClone(input);
  prettifyDiagram(input);
  assert.deepEqual(input, before);
});

test("aligns elements horizontally in vertical lanes", () => {
  const input = {
    lanes: [{ id: "lane-v", participantId: "pool-v", orientation: "vertical", bounds: { x: 0, y: 0, width: 100, height: 500 } }],
    elements: [
      { id: "a", kind: "task", laneId: "lane-v", bounds: { x: 10, y: 20, width: 40, height: 30 } },
      { id: "b", kind: "task", laneId: "lane-v", bounds: { x: 40, y: 120, width: 40, height: 30 } }
    ]
  };
  const result = prettifyDiagram(input, { equalizeLaneCrossAxisSize: false });
  assert.equal(result.diagram.elements[0].bounds.x + 20, result.diagram.elements[1].bounds.x + 20);
});

test("reflows sibling vertical lanes along the horizontal axis", () => {
  const input = {
    lanes: [
      { id: "lane-left", participantId: "pool-v", orientation: "vertical", bounds: { x: 0, y: 0, width: 100, height: 500 } },
      { id: "lane-right", participantId: "pool-v", orientation: "vertical", bounds: { x: 100, y: 0, width: 140, height: 500 } }
    ],
    elements: [
      { id: "task-right", kind: "task", laneId: "lane-right", bounds: { x: 120, y: 40, width: 40, height: 60 } }
    ]
  };
  const result = prettifyDiagram(input, { alignElements: false });
  assert.equal(result.diagram.lanes[0].bounds.width, 140);
  assert.equal(result.diagram.lanes[1].bounds.x, 140);
  assert.equal(result.diagram.elements[0].bounds.x, 160);
});

test("reports missing parent lanes and cyclic lane hierarchies", () => {
  const missingParent = verifyDiagram({
    lanes: [{ id: "child", participantId: "pool", parentLaneId: "missing", orientation: "horizontal", bounds: { x: 0, y: 0, width: 100, height: 50 } }],
    elements: []
  });
  assert.ok(missingParent.diagnostics.some(d => d.code === "PARENT_LANE_NOT_FOUND"));
  assert.equal(missingParent.valid, false);

  const cycle = verifyDiagram({
    lanes: [
      { id: "lane-a", participantId: "pool", parentLaneId: "lane-b", orientation: "horizontal", bounds: { x: 0, y: 0, width: 100, height: 50 } },
      { id: "lane-b", participantId: "pool", parentLaneId: "lane-a", orientation: "horizontal", bounds: { x: 0, y: 50, width: 100, height: 50 } }
    ],
    elements: []
  });
  assert.ok(cycle.diagnostics.some(d => d.code === "LANE_HIERARCHY_CYCLE"));
  assert.equal(cycle.valid, false);
});

test("reports duplicate IDs and missing lanes", () => {
  const result = verifyDiagram({
    lanes: [{ id: "same", participantId: "p", orientation: "horizontal", bounds: { x: 0, y: 0, width: 100, height: 100 } }],
    elements: [{ id: "same", kind: "task", laneId: "missing", bounds: { x: 10, y: 10, width: 20, height: 20 } }]
  });
  assert.ok(result.diagnostics.some(d => d.code === "DUPLICATE_ID"));
  assert.ok(result.diagnostics.some(d => d.code === "LANE_NOT_FOUND"));
});

test("is idempotent for the covered alignment rule", () => {
  const first = prettifyDiagram(sample());
  const second = prettifyDiagram(first.diagram);
  assert.deepEqual(second.diagram, first.diagram);
});

test("reflows sibling lanes and moves their contents when equalizing lane heights", () => {
  const input = {
    lanes: [
      { id: "lane-a", participantId: "pool", orientation: "horizontal", bounds: { x: 0, y: 0, width: 500, height: 100 } },
      { id: "lane-b", participantId: "pool", orientation: "horizontal", bounds: { x: 0, y: 100, width: 500, height: 140 } }
    ],
    elements: [
      { id: "task-a", kind: "task", laneId: "lane-a", bounds: { x: 20, y: 20, width: 80, height: 40 } },
      { id: "task-b", kind: "task", laneId: "lane-b", bounds: { x: 20, y: 120, width: 80, height: 40 } }
    ]
  };
  const result = prettifyDiagram(input, { alignElements: false });
  assert.equal(result.diagram.lanes[0].bounds.height, 140);
  assert.equal(result.diagram.lanes[1].bounds.y, 140);
  assert.equal(result.diagram.lanes[1].bounds.height, 140);
  assert.equal(result.diagram.elements.find(e => e.id === "task-b").bounds.y, 160);
  assert.ok(result.appliedRules.includes("LANE_SIBLINGS_REFLOWED"));
  assert.ok(!result.diagnostics.some(d => d.code === "ELEMENT_OUTSIDE_LANE"));
});

test("moves nested lanes and their contents when a parent lane is reflowed", () => {
  const input = {
    lanes: [
      { id: "lane-a", participantId: "pool", orientation: "horizontal", bounds: { x: 0, y: 0, width: 500, height: 100 } },
      { id: "lane-b", participantId: "pool", orientation: "horizontal", bounds: { x: 0, y: 100, width: 500, height: 140 } },
      { id: "lane-b-child", participantId: "pool", parentLaneId: "lane-b", orientation: "horizontal", bounds: { x: 0, y: 100, width: 500, height: 140 } }
    ],
    elements: [
      { id: "task-child", kind: "task", laneId: "lane-b-child", bounds: { x: 20, y: 120, width: 80, height: 40 } }
    ]
  };
  const result = prettifyDiagram(input, { alignElements: false });
  assert.equal(result.diagram.lanes.find(lane => lane.id === "lane-b").bounds.y, 140);
  assert.equal(result.diagram.lanes.find(lane => lane.id === "lane-b-child").bounds.y, 140);
  assert.equal(result.diagram.elements[0].bounds.y, 160);
});

test("does not reflow sibling lanes beyond maxDisplacement", () => {
  const input = sample();
  input.lanes[1].bounds.y = 100;
  const result = prettifyDiagram(input, { alignElements: false, maxDisplacement: 10 });
  assert.equal(result.diagram.lanes[0].bounds.height, 100);
  assert.equal(result.diagram.lanes[1].bounds.y, 100);
  assert.ok(result.diagnostics.some(d => d.code === "LAYOUT_MAX_DISPLACEMENT"));
});

test("moves a boundary event with its host activity during lane alignment", () => {
  const input = {
    lanes: [{ id: "lane", participantId: "pool", orientation: "horizontal", bounds: { x: 0, y: 0, width: 500, height: 120 } }],
    elements: [
      { id: "host", kind: "task", laneId: "lane", bounds: { x: 50, y: 20, width: 100, height: 40 } },
      { id: "peer", kind: "task", laneId: "lane", bounds: { x: 250, y: 40, width: 100, height: 40 } },
      { id: "boundary", kind: "boundaryEvent", laneId: "lane", attachedToId: "host", layoutLocked: true, bounds: { x: 135, y: 35, width: 25, height: 25 } }
    ]
  };
  const result = prettifyDiagram(input, { equalizeLaneCrossAxisSize: false });
  const host = result.diagram.elements.find(element => element.id === "host");
  const boundary = result.diagram.elements.find(element => element.id === "boundary");
  assert.equal(host.bounds.y, 30);
  assert.equal(boundary.bounds.y, 45);
  assert.ok(!result.diagnostics.some(d => d.code === "ELEMENT_OVERLAP" && d.elementIds.includes("host") && d.elementIds.includes("boundary")));
});
