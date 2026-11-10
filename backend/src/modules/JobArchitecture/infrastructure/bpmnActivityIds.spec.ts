import { extractBpmnActivityIds } from './bpmnActivityIds';

describe('extractBpmnActivityIds', () => {
  it('extracts task IDs using a BPMN namespace prefix', () => {
    const ids = extractBpmnActivityIds(`
      <?xml version="1.0"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="Process_1">
          <bpmn:startEvent id="Start_1"/>
          <bpmn:userTask id="Task_1"/>
          <bpmn:serviceTask id="Task_2"/>
          <bpmn:exclusiveGateway id="Gateway_1"/>
          <bpmn:sequenceFlow id="Flow_1"/>
        </bpmn:process>
      </bpmn:definitions>`);

    expect([...ids].sort()).toEqual(['Task_1', 'Task_2']);
  });

  it('extracts every ID when multiple activities share the same element name', () => {
    const ids = extractBpmnActivityIds(`
      <definitions>
        <process id="Process_1">
          <userTask id="Task_1"/>
          <userTask id="Task_2"/>
        </process>
      </definitions>`);

    expect([...ids].sort()).toEqual(['Task_1', 'Task_2']);
  });

  it('supports a default BPMN namespace and subprocess activities', () => {
    const ids = extractBpmnActivityIds(`
      <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <process id="Process_1">
          <task id="Task_1"/>
          <subProcess id="SubProcess_1"/>
          <callActivity id="Call_1"/>
        </process>
      </definitions>`);

    expect([...ids].sort()).toEqual(['Call_1', 'SubProcess_1', 'Task_1']);
  });

  it('rejects malformed XML', () => {
    expect(() =>
      extractBpmnActivityIds('<definitions><process></definitions>'),
    ).toThrow('not well-formed XML');
  });

  it('does not treat an event or gateway ID as an activity', () => {
    const ids = extractBpmnActivityIds(`
      <definitions>
        <process id="Process_1">
          <startEvent id="Start_1"/>
          <exclusiveGateway id="Gateway_1"/>
        </process>
      </definitions>`);

    expect(ids.has('Start_1')).toBe(false);
    expect(ids.has('Gateway_1')).toBe(false);
  });
});
