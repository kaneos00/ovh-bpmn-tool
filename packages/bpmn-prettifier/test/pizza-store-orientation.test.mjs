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

const semanticSignature = (xml) => ({
  ids: [...xml.matchAll(/<(?:bpmn2?|bpmn):([\\w]+)\\b([^>]*)>/g)]
    .map(m => ({ type: m[1], id: m[2].match(/\\bid="([^"]+)"/)?.[1] }))
    .filter(x => x.id && !["BPMNShape", "BPMNEdge"].includes(x.type))
    .map(x => `${x.type}:${x.id}`).sort(),
  flows: [...xml.matchAll(/<(?:bpmn2?|bpmn):sequenceFlow\\b([^>]*)\\/?\s*>/g)]
    .map(m => {
      const a = m[1];
      return `${a.match(/\\bid="([^"]+)"/)?.[1]}:${a.match(/\\bsourceRef="([^"]+)"/)?.[1]}->${a.match(/\\btargetRef="([^"]+)"/)?.[1]}`;
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
    for (const lane of outputLanes) {
      assert.ok(lane.width > lane.height, `lane ${lane.id} should be horizontal, got ${lane.width}x${lane.height}`);
    }
    assert.deepEqual(semanticSignature(result.xml), semanticSignature(pizzaXml), "round-trip must preserve BPMN IDs and sequence-flow references");
    assert.equal((await verifyBpmnXml(result.xml)).valid, true);
  });
});
