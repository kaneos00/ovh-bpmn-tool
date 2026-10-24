import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  analyzeRaciMatrix,
  getRaciIssueLabel,
  serializeRaciActors,
} from '../../src/extensions/raci-engine.ts';

describe('serializeRaciActors', () => {
  it('normalizes names and removes duplicates case-insensitively', () => {
    const serialized = serializeRaciActors([
      { name: '  Finance  ', source: 'manual', active: true },
      { name: 'finance', source: 'lane', active: false, bpmnId: 'Lane_1' },
      { name: 'Operations', source: 'bpmn', active: true, bpmnId: 'Participant_1' },
    ]);

    assert.deepEqual(JSON.parse(serialized), [
      { name: 'finance', source: 'lane', active: false, bpmnId: 'Lane_1' },
      { name: 'Operations', source: 'bpmn', active: true, bpmnId: 'Participant_1' },
    ]);
  });

  it('drops empty actor names and treats active as true unless explicitly false', () => {
    const serialized = serializeRaciActors([
      { name: '   ', source: 'manual', active: true },
      { name: 'Reviewer', source: 'explicit' },
    ]);

    assert.deepEqual(JSON.parse(serialized), [
      { name: 'Reviewer', source: 'explicit', active: true },
    ]);
  });
});

describe('analyzeRaciMatrix', () => {
  it('reports missing R and A assignments for an activity', () => {
    const result = analyzeRaciMatrix({
      roles: ['Analyst'],
      activities: [{
        elementId: 'Task_1',
        activity: 'Prepare report',
        cells: [{ role: 'Analyst', codes: [], status: 'missing' }],
      }],
    });

    assert.deepEqual(result.issues, [{
      activityId: 'Task_1',
      activity: 'Prepare report',
      codes: ['missing-r', 'missing-a'],
    }]);
  });

  it('reports multiple accountable roles and unused actors', () => {
    const result = analyzeRaciMatrix({
      roles: ['Alice', 'Bob', 'Carol'],
      activities: [{
        elementId: 'Task_2',
        activity: 'Approve request',
        cells: [
          { role: 'Alice', codes: ['R', 'A'], status: 'explicit' },
          { role: 'Bob', codes: ['A'], status: 'explicit' },
          { role: 'Carol', codes: [], status: 'missing' },
        ],
      }],
    });

    assert.deepEqual(result.issues, [{
      activityId: 'Task_2',
      activity: 'Approve request',
      codes: ['multiple-a'],
    }]);
    assert.deepEqual(result.unusedActors, ['Carol']);
  });

  it('does not report an issue when R and exactly one A are assigned', () => {
    const result = analyzeRaciMatrix({
      roles: ['Owner', 'Approver'],
      activities: [{
        elementId: 'Task_3',
        activity: 'Review request',
        cells: [
          { role: 'Owner', codes: ['R'], status: 'explicit' },
          { role: 'Approver', codes: ['A'], status: 'explicit' },
        ],
      }],
    });

    assert.deepEqual(result.issues, []);
    assert.deepEqual(result.unusedActors, []);
  });
});

describe('getRaciIssueLabel', () => {
  it('provides French labels for each supported RACI issue', () => {
    assert.equal(getRaciIssueLabel('missing-r'), 'R manquant');
    assert.equal(getRaciIssueLabel('missing-a'), 'A manquant');
    assert.equal(getRaciIssueLabel('multiple-a'), 'Plusieurs A');
  });
});
