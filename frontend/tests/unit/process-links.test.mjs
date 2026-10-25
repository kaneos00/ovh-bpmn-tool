import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveLinkedChildren,
  resolveProcessTarget,
} from '../../.test-dist/Components/BusinessComponents/FolderTree/processLinks.js';

describe('resolveProcessTarget', () => {
  it('prefers an exact resource ID over a BPMN process ID', () => {
    const direct = { id: 'resource-1' };
    const other = { id: 'resource-2' };

    assert.equal(
      resolveProcessTarget('resource-1', [
        { resource: direct, processIds: ['bpmn-1'] },
        { resource: other, processIds: ['resource-1'] },
      ]),
      direct,
    );
  });

  it('resolves a unique BPMN process ID', () => {
    const resource = { id: 'resource-1' };
    assert.equal(
      resolveProcessTarget('bpmn-1', [{ resource, processIds: ['bpmn-1'] }]),
      resource,
    );
  });

  it('does not guess when a BPMN process ID is ambiguous', () => {
    assert.equal(
      resolveProcessTarget('shared-id', [
        { resource: { id: 'resource-1' }, processIds: ['shared-id'] },
        { resource: { id: 'resource-2' }, processIds: ['shared-id'] },
      ]),
      undefined,
    );
  });

  it('returns undefined for an unknown target', () => {
    assert.equal(
      resolveProcessTarget('missing', [
        { resource: { id: 'resource-1' }, processIds: ['bpmn-1'] },
      ]),
      undefined,
    );
  });
});

describe('resolveLinkedChildren', () => {
  it('deduplicates links, rejects self-links and keeps the valid acyclic portion of a cycle', () => {
    const a = { id: 'A' };
    const b = { id: 'B' };
    const c = { id: 'C' };
    const linked = resolveLinkedChildren([
      { resource: a, processIds: ['pa'], targets: ['B', 'B', 'A'] },
      { resource: b, processIds: ['pb'], targets: ['C'] },
      { resource: c, processIds: ['pc'], targets: ['A'] },
    ]);

    assert.deepEqual((linked.get('A') ?? []).map(resource => resource.id), ['B']);
    assert.deepEqual((linked.get('B') ?? []).map(resource => resource.id), ['C']);
    assert.deepEqual((linked.get('C') ?? []).map(resource => resource.id), []);
  });

  it('does not resolve a duplicated BPMN process ID to an arbitrary resource', () => {
    const a = { id: 'A' };
    const b = { id: 'B' };
    const caller = { id: 'caller' };
    const linked = resolveLinkedChildren([
      { resource: a, processIds: ['shared'], targets: [] },
      { resource: b, processIds: ['shared'], targets: [] },
      { resource: caller, processIds: ['caller-process'], targets: ['shared'] },
    ]);

    assert.deepEqual(linked.get('caller'), []);
  });
});
