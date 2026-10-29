import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import BpmnModdle from "bpmn-moddle";
import { convertBpmnLaneOrientation, verifyBpmnXml } from "../dist/index.js";

const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/Pizza-Store.bpmn");
const pizzaXml = await readFile(fixturePath, "utf8");

const parse = async (xml) => {
  const moddle = new BpmnModdle();
  const result = await moddle.fromXML(xml, "bpmn:Definitions");
  assert.equal((result.warnings ?? []).length, 0, "BPMN fixture/output should parse without warnings");
  return result.rootElement;
};

const laneShapes = (definitions) => {
  const shapes = (definitions.diagrams ?? []).flatMap(d => d.plane?.planeElement ?? [])
    .filter(e => e.$type === "bpmndi:BPMNShape" && e.bpmnElement?.$type === "bpmn:Lane");
  return shapes.map(shape => ({ id: shape.bpmnElement.id, ...shape.bounds }));
};

const participantShapes = (definitions) => (definitions.diagrams ?? []).flatMap(d => d.plane?.planeElement ?? [])
  .filter(e => e.$type === "bpmndi:BPMNShape" && e.bpmnElement?.$type === "bpmn:Participant");

const edgeWaypointCount = (definitions) => (definitions.diagrams ?? [])
  .flatMap(d => d.plane?.planeElement ?? [])
  .filter(e => e.$type === "bpmndi:BPMNEdge")
  .reduce((total, edge) => total + (edge.waypoint?.length ?? 0), 0);

const shapeByElementId = (definitions, id) => (definitions.diagrams ?? [])
  .flatMap(d => d.plane?.planeElement ?? [])
  .find(e => e.$type === "bpmndi:BPMNShape" && e.bpmnElement?.id === id);

const assertOrthogonalEdges = (definitions) => {
  const edges = (definitions.diagrams ?? []).flatMap(d => d.plane?.planeElement ?? [])
    .filter(e => e.$type === "bpmndi:BPMNEdge");
  for (const edge of edges) {
    for (let index = 1; index < (edge.waypoint ?? []).length; index++) {
      const a = edge.waypoint[index - 1];
      const b = edge.waypoint[index];
      assert.ok(Math.abs(a.x - b.x) < 0.001 || Math.abs(a.y - b.y) < 0.001,
        `edge ${edge.bpmnElement?.id ?? edge.id} should use right-angle segments`);
    }
  }
};

const semanticSignature = (xml) => ({
  ids: [...xml.matchAll(/<(?:bpmn2?|bpmn):([\w]+)\b([^>]*)>/g)]
    .map(m => ({ type: m[1], id: m[2].match(/\bid="([^"]+)"/)?.[1] }))
    .filter(x => x.id && !["BPMNShape", "BPMNEdge"].includes(x.type))
    .map(x => `${x.type}:${x.id}`).sort(),
  flows: [...xml.matchAll(/<(?:bpmn2?|bpmn):sequenceFlow\b([^>]*)\/?\s*>/g)]
    .map(m => {
      const a = m[1];
      return `${a.match(/\bid="([^"]+)"/)?.[1]}:${a.match(/\bsourceRef="([^"]+)"/)?.[1]}->${a.match(/\btargetRef="([^"]+)"/)?.[1]}`;
    }).sort()
});

describe("Pizza Store real-world BPMN orientation conversion", () => {
  it("converts the complete source diagram to vertical lanes and preserves semantics", async () => {
    const source = await parse(pizzaXml);
    const sourceLanes = laneShapes(source);
    assert.equal(sourceLanes.length, 3, "source must contain all three vendor lanes");
    assert.equal((source.rootElements ?? []).filter(e => e.$type === "bpmn:Collaboration")
      .flatMap(e => e.participants ?? []).length, 2, "source must contain two participants");

    const result = await convertBpmnLaneOrientation(pizzaXml, "vertical");
    assert.equal(result.targetOrientation, "vertical");
    assert.ok(result.layout.appliedRules.length > 0, "V1 layout engine should run after V2 conversion");

    const output = await parse(result.xml);
    const outputLanes = laneShapes(output);
    assert.equal(outputLanes.length, 3, "all three lanes must remain present");
    const verticalParticipants = participantShapes(output);
    assert.equal(verticalParticipants.length, 2, "both participants must remain present");
    assert.ok(verticalParticipants.every(shape => shape.isHorizontal === false),
      "participant orientation flags must match vertical bounds");
    assert.ok(edgeWaypointCount(output) > 0, "sequence and message-flow waypoints must be preserved");
    assertOrthogonalEdges(output);
    const startShape = shapeByElementId(output, "id-b851067f-7b6d-44a4-974b-24e2aa8ef1c0");
    const endShape = shapeByElementId(output, "id-b6eb8e6c-d230-44b0-8020-a1c2a7e82c66");
    assert.ok(startShape.bounds.y < endShape.bounds.y,
      "vertical conversion must place the process start above its end event");
    for (const lane of outputLanes) {
      assert.ok(lane.width < lane.height, `lane ${lane.id} should be vertical, got ${lane.width}x${lane.height}`);
    }
    assert.deepEqual(semanticSignature(result.xml), semanticSignature(pizzaXml), "BPMN IDs and sequence-flow references must be preserved");
    assert.equal((await verifyBpmnXml(result.xml)).valid, true, "converted BPMN must pass XML verification");
  });

  it("converts the same complete diagram back to horizontal lanes", async () => {
    const vertical = await convertBpmnLaneOrientation(pizzaXml, "vertical");
    const result = await convertBpmnLaneOrientation(vertical.xml, "horizontal");
    assert.equal(result.sourceOrientation, "vertical");
    assert.equal(result.targetOrientation, "horizontal");

    const output = await parse(result.xml);
    const outputLanes = laneShapes(output);
    assert.equal(outputLanes.length, 3);
    const horizontalParticipants = participantShapes(output);
    assert.equal(horizontalParticipants.length, 2);
    assert.ok(horizontalParticipants.every(shape => shape.isHorizontal === true),
      "participant orientation flags must match horizontal bounds");
    assert.ok(edgeWaypointCount(output) > 0, "round-trip must preserve edge waypoints");
    assertOrthogonalEdges(output);
    for (const lane of outputLanes) {
      assert.ok(lane.width > lane.height, `lane ${lane.id} should be horizontal, got ${lane.width}x${lane.height}`);
    }
    assert.deepEqual(semanticSignature(result.xml), semanticSignature(pizzaXml), "round-trip must preserve BPMN IDs and sequence-flow references");
    assert.equal((await verifyBpmnXml(result.xml)).valid, true);
  });
});
