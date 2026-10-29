import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { prettifyBpmnXml, verifyBpmnXml } from "../dist/bpmn-xml.js";

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
 xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
 xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
 xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
 id="Definitions_1" targetNamespace="https://example.test/bpmn">
 <bpmn:process id="Process_1" isExecutable="false">
  <bpmn:laneSet id="LaneSet_1">
   <bpmn:lane id="Lane_A" name="A"><bpmn:flowNodeRef>Task_A</bpmn:flowNodeRef><bpmn:flowNodeRef>Task_B</bpmn:flowNodeRef></bpmn:lane>
   <bpmn:lane id="Lane_B" name="B"><bpmn:flowNodeRef>Task_C</bpmn:flowNodeRef></bpmn:lane>
  </bpmn:laneSet>
  <bpmn:task id="Task_A" name="Alpha"/><bpmn:task id="Task_B" name="Beta"/><bpmn:task id="Task_C" name="Gamma"/>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_1"><bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1">
  <bpmndi:BPMNShape id="Lane_A_di" bpmnElement="Lane_A"><dc:Bounds x="0" y="0" width="600" height="100"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Lane_B_di" bpmnElement="Lane_B"><dc:Bounds x="0" y="100" width="600" height="140"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_A_di" bpmnElement="Task_A"><dc:Bounds x="80" y="10" width="100" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_B_di" bpmnElement="Task_B"><dc:Bounds x="300" y="20" width="100" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_C_di" bpmnElement="Task_C"><dc:Bounds x="80" y="120" width="100" height="80"/></bpmndi:BPMNShape>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

describe("BPMN XML adapter", () => {
  it("aligns existing BPMN shapes and keeps semantic elements intact", async () => {
    const result = await prettifyBpmnXml(fixture);
    assert.ok(result.layout.appliedRules.includes("LANE_ELEMENTS_ALIGN_CENTER_Y"));
    assert.ok(result.xml.includes('id="Task_A"'));
    assert.ok(result.xml.includes('name="Alpha"'));
    assert.ok(result.xml.includes('bpmn:sequenceFlow') === false);
    const verification = await verifyBpmnXml(result.xml);
    assert.equal(verification.valid, true);
    assert.equal(verification.diagnostics.length, 0);
  });

  it("does not mutate the input string and returns parseable XML", async () => {
    const before = fixture;
    const result = await prettifyBpmnXml(fixture, { equalizeLaneCrossAxisSize: false });
    assert.equal(fixture, before);
    assert.ok(result.xml.includes("<bpmn:definitions"));
    assert.ok(result.xml.includes('id="Lane_B"'));
  });

  it("reports missing lane DI bounds without crashing", async () => {
    const noLaneShape = fixture.replace(/<bpmndi:BPMNShape id="Lane_A_di"[\s\S]*?<\/bpmndi:BPMNShape>/, "");
    const result = await verifyBpmnXml(noLaneShape);
    assert.ok(result.warnings.some(message => message.includes("no BPMN-DI bounds")));
  });
  it("parses and serializes a real repository BPMN fixture", async () => {
    const fixturePath = new URL("../../../frontend/tests/fixtures/Parking%20(copie)_v9.bpmn", import.meta.url);
    const realXml = await readFile(fileURLToPath(fixturePath), "utf8");
    const result = await prettifyBpmnXml(realXml, { alignElements: false, equalizeLaneCrossAxisSize: false });
    const reparsed = await verifyBpmnXml(result.xml);
    assert.match(result.xml, /definitions/i);
    assert.equal(reparsed.valid, true);
  });
});
