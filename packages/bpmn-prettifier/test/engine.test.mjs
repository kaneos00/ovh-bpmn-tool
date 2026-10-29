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

test("does not equalize a lane by creating an overlap with its sibling", () => {
  const input = sample();
  input.lanes[1].bounds.y = 100;
  const result = prettifyDiagram(input, { alignElements: false });
  assert.equal(result.diagram.lanes[0].bounds.height, 100);
  assert.ok(result.diagnostics.some(d => d.code === "LANE_SIZE_WOULD_OVERLAP"));
});
