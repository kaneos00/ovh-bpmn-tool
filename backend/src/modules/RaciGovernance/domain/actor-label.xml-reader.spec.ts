import {
  ActorLabelXmlReadError,
  ActorLabelXmlReader,
} from './actor-label.xml-reader';

describe('ActorLabelXmlReader', () => {
  const reader = new ActorLabelXmlReader();

  it('reads scalar RACI assignments on bpmn-prefixed elements', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn:process id="Process_1">
          <bpmn:task id="Task_1" name="Review"
            raci:responsible="Responsable IVV"
            raci:accountable="Direction qualité"
            raci:responsibleStatus="explicit" />
        </bpmn:process>
      </bpmn:definitions>`;

    expect(reader.read(xml)).toEqual([
      {
        elementId: 'Task_1',
        elementType: 'task',
        field: 'raci:responsible',
        label: 'Responsable IVV',
        normalizedLabel: 'responsable ivv',
        source: 'raci-attribute',
        role: 'responsible',
      },
      {
        elementId: 'Task_1',
        elementType: 'task',
        field: 'raci:accountable',
        label: 'Direction qualité',
        normalizedLabel: 'direction qualite',
        source: 'raci-attribute',
        role: 'accountable',
      },
    ]);
  });

  it('supports bpmn2 and an alternative prefix bound to the RACI namespace', () => {
    const xml = `
      <bpmn2:definitions
        xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:gov="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn2:process id="Process_2">
          <bpmn2:task id="Task_2" gov:consulted="Équipe métier" />
        </bpmn2:process>
      </bpmn2:definitions>`;

    expect(reader.read(xml)).toEqual([
      {
        elementId: 'Task_2',
        elementType: 'task',
        field: 'raci:consulted',
        label: 'Équipe métier',
        normalizedLabel: 'equipe metier',
        source: 'raci-attribute',
        role: 'consulted',
      },
    ]);
  });

  it('reads entity-escaped raci:actors JSON and retains metadata and duplicates', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn:process id="Process_3"
          raci:actors="[{&quot;name&quot;:&quot;Équipe R&amp;D \\&quot;Nord\\&quot;&quot;,&quot;source&quot;:&quot;manual&quot;,&quot;active&quot;:false,&quot;bpmnId&quot;:&quot;Actor_1&quot;},{&quot;name&quot;:&quot;Équipe R&amp;D \\&quot;Nord\\&quot;&quot;,&quot;source&quot;:&quot;bpmn&quot;,&quot;active&quot;:true}]">
        </bpmn:process>
      </bpmn:definitions>`;

    const occurrences = reader.read(xml);

    expect(occurrences).toHaveLength(2);
    expect(occurrences[0]).toMatchObject({
      elementId: 'Process_3',
      elementType: 'process',
      field: 'raci:actors.name',
      label: 'Équipe R&D "Nord"',
      normalizedLabel: 'equipe r d nord',
      source: 'raci-actors-json',
      actorIndex: 0,
      actorSource: 'manual',
      active: false,
      bpmnId: 'Actor_1',
    });
    expect(occurrences[1]).toMatchObject({
      actorIndex: 1,
      actorSource: 'bpmn',
      active: true,
      label: 'Équipe R&D "Nord"',
    });
  });

  it('does not treat unrelated name or status attributes as actors', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn:process id="Process_4">
          <bpmn:sequenceFlow id="Flow_1" name="Responsable IVV"
            raci:responsibleStatus="explicit" />
          <bpmn:messageFlow id="Message_1" name="Direction qualité" />
          <bpmn:task id="Task_4" name="Do work" raci:informedStatus="explicit" />
        </bpmn:process>
      </bpmn:definitions>`;

    expect(reader.read(xml)).toEqual([]);
  });

  it('ignores a raci prefix bound to an unrelated namespace', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://example.invalid/not-raci">
        <bpmn:task id="Task_5" raci:responsible="Not an actor" />
      </bpmn:definitions>`;

    expect(reader.read(xml)).toEqual([]);
  });

  it('skips empty actor labels but keeps non-empty occurrences', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn:task id="Task_6" raci:responsible="   " raci:informed="---" />
      </bpmn:definitions>`;

    expect(reader.read(xml)).toEqual([]);
  });

  it('fails closed on malformed XML', () => {
    expect(() =>
      reader.read('<bpmn:definitions><bpmn:task></bpmn:definitions>'),
    ).toThrow(ActorLabelXmlReadError);
  });

  it('fails closed on malformed raci:actors JSON', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn:process id="Process_7" raci:actors="[{&quot;name&quot;:&quot;broken&quot;}" />
      </bpmn:definitions>`;

    expect(() => reader.read(xml)).toThrow(ActorLabelXmlReadError);
  });

  it('fails closed when raci:actors is not an array of named actors', () => {
    const xml = `
      <bpmn:definitions
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:raci="https://ovh-bpmn-tool.local/schema/raci">
        <bpmn:process id="Process_8" raci:actors="{}" />
      </bpmn:definitions>`;

    expect(() => reader.read(xml)).toThrow(ActorLabelXmlReadError);
  });
});
