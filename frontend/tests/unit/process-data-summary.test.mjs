import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { summarizeProcessData } from '../../.test-dist/shared/helpers/processDataSummary.js';

describe('summarizeProcessData', () => {
  it('counts distinct BPMN inputs and outputs from their types and associations', () => {
    const summary = summarizeProcessData([
      { id: 'input-1', bpmnType: 'dataInput', associations: [] },
      { id: 'output-1', bpmnType: 'dataOutput', associations: [] },
      { id: 'document-1', bpmnType: 'dataObjectReference', associations: [{ direction: 'input' }] },
      { id: 'document-2', bpmnType: 'dataObjectReference', associations: [{ direction: 'output' }] },
      { id: 'shared-1', bpmnType: 'dataStoreReference', associations: [{ direction: 'input' }, { direction: 'output' }] },
      { id: 'unclassified-1', bpmnType: 'dataObjectReference', associations: [] },
    ]);

    assert.deepEqual(summary, { sourceCount: 6, inputCount: 3, outputCount: 3 });
  });

  it('counts a source once even when it is associated with several activities', () => {
    const summary = summarizeProcessData([
      { id: 'shared', bpmnType: 'dataObjectReference', associations: [{ direction: 'input' }, { direction: 'input' }] },
      { id: 'shared', bpmnType: 'dataObjectReference', associations: [{ direction: 'output' }] },
    ]);

    assert.deepEqual(summary, { sourceCount: 1, inputCount: 1, outputCount: 1 });
  });

  it('returns zero counts for an empty inventory and ignores missing IDs', () => {
    assert.deepEqual(summarizeProcessData([]), { sourceCount: 0, inputCount: 0, outputCount: 0 });
    assert.deepEqual(
      summarizeProcessData([{ id: '', bpmnType: 'dataInput', associations: [] }]),
      { sourceCount: 0, inputCount: 0, outputCount: 0 },
    );
  });
});
