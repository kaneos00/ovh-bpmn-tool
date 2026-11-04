import { ProjectRaciRole } from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import {
  extractBpmnSearchResults,
  getSearchSimilarity,
  isExactSearchTextMatch,
  isSearchTextMatch,
  normalizeSearchText,
} from './unified-search.service';

describe('unified search normalization', () => {
  it('matches case and accents consistently', () => {
    expect(normalizeSearchText('  RÉVISION   Générale ')).toBe(
      'revision generale',
    );
    expect(normalizeSearchText('REVISION generale')).toBe('revision generale');
  });

  it('scores exact, substring and typo matches on a 0-100 scale', () => {
    expect(getSearchSimilarity('Validation des factures', 'VALIDATION')).toBe(100);
    expect(getSearchSimilarity('entretien annuel', 'entre')).toBe(56);
    expect(getSearchSimilarity('Validation des factures', 'validaton')).toBe(90);
    expect(getSearchSimilarity('Validation des factures', 'livraison')).toBe(0);
  });

  it('matches conservative typos only for sufficiently long words', () => {
    expect(isSearchTextMatch('Validation des factures', 'validaton')).toBe(true);
    expect(isSearchTextMatch('Validation des factures', 'VALIDATION')).toBe(true);
    expect(isSearchTextMatch('Validation des factures', 'val')).toBe(false);
    expect(isSearchTextMatch('Validation des factures', 'valdiation')).toBe(true);
    expect(isSearchTextMatch('Validation des factures', 'livraison')).toBe(false);
    expect(isSearchTextMatch('Gestion des commandes', 'gestion comandes')).toBe(true);
    expect(isExactSearchTextMatch('Supplier invoice validation', 'invoice supplier')).toBe(true);
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
    const activity = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'invoice',
      ['bpmn'],
    );
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      type: 'bpmn',
      elementId: 'Task_Approve',
      field: 'nome',
      processName: 'Order',
    });

    const description = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'supplier',
      ['bpmn'],
    );
    expect(description[0]).toMatchObject({
      elementId: 'Task_Approve',
      field: 'descrizione',
    });

    const lane = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'finance',
      ['bpmn'],
    );
    expect(lane[0]).toMatchObject({
      elementId: 'Lane_Finance',
      label: 'Lane: Finance',
    });

    const annotation = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'reference',
      ['bpmn'],
    );
    expect(annotation[0]).toMatchObject({
      elementId: 'Text_Note',
      field: 'testo annotazione',
    });
  });

  it('finds BPMN activities through a typo without accepting short fuzzy terms', () => {
    const typoResults = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'invoce',
      ['bpmn'],
    );
    expect(typoResults).toHaveLength(1);
    expect(typoResults[0]).toMatchObject({
      elementId: 'Task_Approve',
      field: 'nome',
    });

    expect(
      extractBpmnSearchResults(xml, 'resource-1', 'Order', 'invo', ['bpmn']),
    ).toEqual([]);
  });

  it('indexes BPMN actors and explicit RACI assignments with type filters', () => {
    const raci = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'controller',
      ['raci'],
    );
    expect(raci).toHaveLength(1);
    expect(raci[0]).toMatchObject({
      type: 'raci',
      elementId: 'Task_Approve',
      role: 'A',
      source: 'bpmn',
    });

    expect(
      extractBpmnSearchResults(
        xml,
        'resource-1',
        'Order',
        'controller',
        ['raci'],
        ProjectRaciRole.Responsible,
      ),
    ).toEqual([]);

    const actor = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'finance manager',
      ['actor'],
    );
    expect(actor[0]).toMatchObject({
      type: 'actor',
      label: 'Finance Manager',
      source: 'bpmn',
    });

    const laneActor = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'finance',
      ['actor'],
    );
    expect(laneActor.some((result) => result.label === 'Finance')).toBe(true);
  });

  it('returns one BPMN result with its task description when both name and description match', () => {
    const results = extractBpmnSearchResults(
      xml,
      'resource-1',
      'Order',
      'invoice',
      ['bpmn'],
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'bpmn',
      id: 'Task_Approve',
      elementId: 'Task_Approve',
      field: 'nome',
      description: 'Check supplier invoice before payment',
    });
  });

  it('indexes descriptions attached to BPMN element types without a dedicated label', () => {
    const xmlWithGenericElement = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="Process_Order" name="Order">
        <dataObjectReference id="Data_Supplier" name="Supplier record">
          <documentation>Supplier master data source</documentation>
        </dataObjectReference>
      </process></definitions>`;
    const results = extractBpmnSearchResults(
      xmlWithGenericElement,
      'resource-1',
      'Order',
      'master data',
      ['bpmn'],
    );
    expect(results).toContainEqual(
      expect.objectContaining({
        type: 'bpmn',
        elementId: 'Data_Supplier',
        field: 'descrizione',
        excerpt: 'Supplier master data source',
      }),
    );
  });

  it('indexes process-level documentation and inferred lane RACI assignments', () => {
    const processXml = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="Process_Order" name="Order">
        <documentation>Supplier onboarding policy</documentation>
        <laneSet id="LaneSet_1"><lane id="Lane_Finance" name="Finance"><flowNodeRef>Task_Approve</flowNodeRef></lane></laneSet>
        <userTask id="Task_Approve" name="Approve supplier"/>
      </process></definitions>`;
    const description = extractBpmnSearchResults(
      processXml,
      'resource-1',
      'Order',
      'onboarding',
      ['bpmn'],
    );
    expect(description).toContainEqual(
      expect.objectContaining({
        type: 'bpmn',
        field: 'descrizione',
        elementId: 'Process_Order',
        source: 'bpmn',
      }),
    );
    const raci = extractBpmnSearchResults(
      processXml,
      'resource-1',
      'Order',
      'finance',
      ['raci'],
    );
    expect(raci).toContainEqual(
      expect.objectContaining({
        type: 'raci',
        elementId: 'Task_Approve',
        role: 'R',
        source: 'bpmn',
      }),
    );
    expect(raci).toContainEqual(
      expect.objectContaining({
        type: 'raci',
        elementId: 'Task_Approve',
        role: 'A',
        source: 'bpmn',
      }),
    );
  });

  it('excludes BPMN connecting objects such as sequence flows from search results', () => {
    const flowXml = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="Process_Order" name="Order">
        <task id="Task_Start" name="Start payment" />
        <task id="Task_End" name="End payment" />
        <sequenceFlow id="Flow_Payment" name="Payment route" sourceRef="Task_Start" targetRef="Task_End">
          <documentation>Payment routing arrow</documentation>
        </sequenceFlow>
      </process></definitions>`;
    const results = extractBpmnSearchResults(
      flowXml,
      'resource-1',
      'Order',
      'payment',
      ['bpmn'],
    );
    expect(results.map((result) => result.elementId)).toEqual([
      'Task_Start',
      'Task_End',
    ]);
    expect(results.some((result) => result.elementId === 'Flow_Payment')).toBe(
      false,
    );
  });

  it('does not expand document-defined XML entities', () => {
    const hostileXml = `<!DOCTYPE definitions [<!ENTITY privateValue "expanded-secret">]>
      <definitions><process><task id="Task_1" name="Payment">
        <documentation>&privateValue;</documentation>
      </task></process></definitions>`;
    expect(
      extractBpmnSearchResults(
        hostileXml,
        'resource-1',
        'Payment',
        'expanded-secret',
      ),
    ).toEqual([]);
  });

  it('skips documents over the configured byte limit', () => {
    expect(
      extractBpmnSearchResults(
        'x'.repeat(1_000_001),
        'resource-1',
        'Large',
        'large',
      ),
    ).toEqual([]);
  });
});
