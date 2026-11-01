import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { enqueueModelerImport } from '../../.test-dist/shared/utils/modelerImportQueue.js';

describe('enqueueModelerImport', () => {
  it('serializes imports requested by independent hooks on the same instance', async () => {
    const modeler = {};
    const events = [];
    let releaseFirst;

    const firstGate = new Promise(resolve => {
      releaseFirst = resolve;
    });

    const first = enqueueModelerImport(modeler, async () => {
      events.push('first:start');
      await firstGate;
      events.push('first:end');
    });
    const second = enqueueModelerImport(modeler, async () => {
      events.push('second:start');
      events.push('second:end');
    });

    await Promise.resolve();
    assert.deepEqual(events, ['first:start']);

    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(events, [
      'first:start',
      'first:end',
      'second:start',
      'second:end',
    ]);
  });

  it('continues the queue after a failed import', async () => {
    const modeler = {};
    const next = [];

    const failed = enqueueModelerImport(modeler, async () => {
      next.push('failed');
      throw new Error('invalid BPMN');
    });
    const succeeding = enqueueModelerImport(modeler, async () => {
      next.push('succeeded');
    });

    await assert.rejects(failed, /invalid BPMN/);
    await succeeding;
    assert.deepEqual(next, ['failed', 'succeeded']);
  });

  it('does not block imports on a different Modeler instance', async () => {
    const firstModeler = {};
    const secondModeler = {};
    let releaseFirst;
    const firstGate = new Promise(resolve => {
      releaseFirst = resolve;
    });
    const events = [];

    const first = enqueueModelerImport(firstModeler, async () => {
      events.push('first:start');
      await firstGate;
      events.push('first:end');
    });
    const second = enqueueModelerImport(secondModeler, async () => {
      events.push('second');
    });

    await second;
    assert.deepEqual(events, ['first:start', 'second']);

    releaseFirst();
    await first;
    assert.deepEqual(events, ['first:start', 'second', 'first:end']);
  });
});
