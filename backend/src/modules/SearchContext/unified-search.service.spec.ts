import { extractBpmnSearchResults, normalizeSearchText } from './unified-search.service';

describe('unified search normalization', () => {
  it('matches case and accents consistently', () => {
    expect(normalizeSearchText('  RÉVISION   Générale ')).toBe('revision generale');
    expect(normalizeSearchText('REVISION generale')).toBe('revision generale');
  });
});

describe('BPMN search extraction', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="Process_Order" name="Order" actors='["Finance Manager"]'>
        <userTask id="Task_Approve" name="Approve invoice" responsible="Finance" accountable="Controller">
          <documentation>Check supplier invoice before payment</documentation>
        </userTask>
        <lane id="Lane_Finance" name="Finance" />
        <textAnnotation id="Text_Note"><text>Verify the payment reference</text></textAnnotation>
      </process>
    </definitions>`;

  it('finds activity names, descriptions, lanes and annotation text', () => {
    const activity = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'invoice');
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      type: 'bpmn',
      elementId: 'Task_Approve',
      field: 'nome',
      processName: 'Order',
    });

    const description = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'supplier');
    expect(description[0]).toMatchObject({ elementId: 'Task_Approve', field: 'descrizione' });

    const lane = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'finance');
    expect(lane[0]).toMatchObject({ elementId: 'Lane_Finance', label: 'Lane: Finance' });

    const annotation = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'reference');
    expect(annotation[0]).toMatchObject({ elementId: 'Text_Note', field: 'testo annotazione' });
  });


  it('indexes BPMN actors and explicit RACI assignments with type filters', () => {
    const raci = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'controller', ['raci']);
    expect(raci).toHaveLength(1);
    expect(raci[0]).toMatchObject({
      type: 'raci',
      elementId: 'Task_Approve',
      role: 'A',
      source: 'bpmn',
    });

    const actor = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'finance manager', ['actor']);
    expect(actor[0]).toMatchObject({
      type: 'actor',
      label: 'Finance Manager',
      source: 'bpmn',
    });

    const laneActor = extractBpmnSearchResults(xml, 'resource-1', 'Order', 'finance', ['actor']);
    expect(laneActor.some((result) => result.label === 'Finance')).toBe(true);
  });

  it('does not expand document-defined XML entities', () => {
    const hostileXml = `<!DOCTYPE definitions [<!ENTITY privateValue "expanded-secret">]>
      <definitions><process><task id="Task_1" name="Payment">
        <documentation>&privateValue;</documentation>
      </task></process></definitions>`;
    expect(extractBpmnSearchResults(hostileXml, 'resource-1', 'Payment', 'expanded-secret')).toEqual([]);
  });

  it('skips documents over the configured byte limit', () => {
    expect(extractBpmnSearchResults('x'.repeat(1_000_001), 'resource-1', 'Large', 'large')).toEqual([]);
  });
});
