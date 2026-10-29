import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertBpmnLaneOrientation, verifyBpmnXml } from "../dist/index.js";

const horizontalFixture = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
 xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
 xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
 xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
 id="Definitions_1" targetNamespace="https://example.test/bpmn">
 <bpmn:collaboration id="Collaboration_1"><bpmn:participant id="Participant_1" name="Pool" processRef="Process_1"/></bpmn:collaboration>
 <bpmn:process id="Process_1" isExecutable="false">
  <bpmn:laneSet id="LaneSet_1">
   <bpmn:lane id="Lane_A" name="A"><bpmn:flowNodeRef>Task_A</bpmn:flowNodeRef><bpmn:flowNodeRef>Task_B</bpmn:flowNodeRef></bpmn:lane>
   <bpmn:lane id="Lane_B" name="B"><bpmn:flowNodeRef>Task_C</bpmn:flowNodeRef></bpmn:lane>
  </bpmn:laneSet>
  <bpmn:task id="Task_A" name="Alpha"/><bpmn:task id="Task_B" name="Beta"/><bpmn:task id="Task_C" name="Gamma"/>
  <bpmn:sequenceFlow id="Flow_AB" sourceRef="Task_A" targetRef="Task_B"/>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_1"><bpmndi:BPMNPlane id="Plane_1" bpmnElement="Collaboration_1">
  <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1"><dc:Bounds x="0" y="0" width="600" height="240"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Lane_A_di" bpmnElement="Lane_A"><dc:Bounds x="0" y="0" width="600" height="100"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Lane_B_di" bpmnElement="Lane_B"><dc:Bounds x="0" y="100" width="600" height="140"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_A_di" bpmnElement="Task_A"><dc:Bounds x="80" y="10" width="100" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_B_di" bpmnElement="Task_B"><dc:Bounds x="300" y="20" width="100" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_C_di" bpmnElement="Task_C"><dc:Bounds x="80" y="120" width="100" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_AB_di" bpmnElement="Flow_AB"><di:waypoint x="180" y="50"/><di:waypoint x="300" y="60"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const shapeBounds = (xml, semanticId) => {
  const escaped = semanticId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const shape = xml.match(new RegExp(`<bpmndi:BPMNShape\\b(?=[^>]*bpmnElement="${escaped}")[^>]*>[\\s\\S]*?<dc:Bounds([^>]*)\\/>`));
  assert.ok(shape, `missing DI shape for ${semanticId}`);
  const attrs = Object.fromEntries([...shape[1].matchAll(/(x|y|width|height)="([^"]+)"/g)].map(m => [m[1], Number(m[2])]));
  return attrs;
};

const assertOrthogonalEdges = (xml) => {
  const edges = [...xml.matchAll(/<bpmndi:BPMNEdge\b[^>]*>([\s\S]*?)<\/bpmndi:BPMNEdge>/g)];
  for (const edge of edges) {
    const points = [...edge[1].matchAll(/<di:waypoint\b[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*\/>/g)]
      .map(match => ({ x: Number(match[1]), y: Number(match[2]) }));
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1];
      const b = points[index];
      assert.ok(Math.abs(a.x - b.x) < 0.001 || Math.abs(a.y - b.y) < 0.001,
        "every BPMN-DI edge segment should be horizontal or vertical");
    }
  }
};

const semanticSignature = (xml) => ({
  ids: [...xml.matchAll(/<bpmn:([\w]+)\b[^>]*\bid="([^"]+)"/g)].map(m => `${m[1]}:${m[2]}`).sort(),
  flows: [...xml.matchAll(/<bpmn:sequenceFlow\b([^>]*)>/g)].map(m => {
    const attrs = m[1];
    return `${attrs.match(/\bid="([^"]+)"/)?.[1]}:${attrs.match(/\bsourceRef="([^"]+)"/)?.[1]}->${attrs.match(/\btargetRef="([^"]+)"/)?.[1]}`;
  }).sort()
});

describe("BPMN lane orientation conversion V2", () => {
  it("converts horizontal lanes to vertical and runs the V1 engine", async () => {
    const result = await convertBpmnLaneOrientation(horizontalFixture, "vertical");
    assert.equal(result.sourceOrientation, "horizontal");
    assert.equal(result.targetOrientation, "vertical");
    assert.ok(result.layout.appliedRules.length > 0, "V1 should run after conversion");
    for (const laneId of ["Lane_A", "Lane_B"]) {
      const bounds = shapeBounds(result.xml, laneId);
      assert.ok(bounds.width < bounds.height, `${laneId} should be vertical`);
    }
    assert.deepEqual(semanticSignature(result.xml), semanticSignature(horizontalFixture));
    assertOrthogonalEdges(result.xml);
    assert.equal((await verifyBpmnXml(result.xml)).valid, true);
  });

  it("converts vertical lanes back to horizontal", async () => {
    const vertical = await convertBpmnLaneOrientation(horizontalFixture, "vertical");
    const result = await convertBpmnLaneOrientation(vertical.xml, "horizontal");
    assert.equal(result.sourceOrientation, "vertical");
    assert.equal(result.targetOrientation, "horizontal");
    for (const laneId of ["Lane_A", "Lane_B"]) {
      const bounds = shapeBounds(result.xml, laneId);
      assert.ok(bounds.width > bounds.height, `${laneId} should be horizontal`);
    }
    assert.deepEqual(semanticSignature(result.xml), semanticSignature(horizontalFixture));
    assertOrthogonalEdges(result.xml);
    assert.equal((await verifyBpmnXml(result.xml)).valid, true);
  });

  it("runs V1 without rotating again when the requested orientation already matches", async () => {
    const result = await convertBpmnLaneOrientation(horizontalFixture, "horizontal");
    assert.equal(result.sourceOrientation, "horizontal");
    assert.equal(result.targetOrientation, "horizontal");
    assert.ok(result.layout.appliedRules.length > 0);
    assert.deepEqual(semanticSignature(result.xml), semanticSignature(horizontalFixture));
  });

  it("refuses to guess when lane orientation cannot be determined", async () => {
    const square = horizontalFixture.replace('width="600" height="100"', 'width="100" height="100"')
      .replace('width="600" height="140"', 'width="140" height="140"');
    await assert.rejects(() => convertBpmnLaneOrientation(square, "vertical"), /Cannot determine lane orientation/);
  });
});
