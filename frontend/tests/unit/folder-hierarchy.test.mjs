import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveFolderHierarchy } from '../../.test-dist/shared/helpers/folderHierarchy.js';

const folder = (id, parentId, depth) => ({
  id,
  name: id,
  type: 'folder',
  parentId,
  depth,
});

describe('resolveFolderHierarchy', () => {
  it('returns all ancestors in root-to-leaf order', () => {
    const result = resolveFolderHierarchy([
      folder('a', undefined, 0),
      folder('b', 'a', 1),
      folder('c', 'b', 2),
    ], 'c');

    assert.deepEqual(result.hierarchy.map(item => item.id), ['a', 'b', 'c']);
    assert.deepEqual(result.issues, []);
  });

  it('reports a missing intermediate parent without inventing it', () => {
    const result = resolveFolderHierarchy([
      folder('a', undefined, 0),
      folder('c', 'missing-b', 2),
    ], 'c');

    assert.deepEqual(result.hierarchy.map(item => item.id), ['c']);
    assert.deepEqual(result.issues, [{
      code: 'missing-parent',
      resourceId: 'c',
      parentId: 'missing-b',
    }]);
  });

  it('stops safely on a parent cycle and does not produce a false breadcrumb', () => {
    const result = resolveFolderHierarchy([
      folder('a', 'b', 2),
      folder('b', 'a', 1),
    ], 'a');

    assert.deepEqual(result.hierarchy, []);
    assert.equal(result.issues[0]?.code, 'cycle');
  });

  it('reports a stale stored depth while preserving the parent-link order', () => {
    const result = resolveFolderHierarchy([
      folder('a', undefined, 0),
      folder('b', 'a', 4),
      folder('c', 'b', 5),
    ], 'c');

    assert.deepEqual(result.hierarchy.map(item => item.id), ['a', 'b', 'c']);
    assert.ok(result.issues.some(issue =>
      issue.code === 'depth-mismatch' &&
      issue.resourceId === 'b' &&
      issue.expectedDepth === 1 &&
      issue.actualDepth === 4,
    ));
  });

  it('returns only the virtual root for an unknown folder id', () => {
    const result = resolveFolderHierarchy([], 'not-found');

    assert.deepEqual(result.hierarchy, []);
    assert.equal(result.issues[0]?.code, 'missing-folder');
  });

  it('accepts an empty/root location without reporting an error', () => {
    assert.deepEqual(resolveFolderHierarchy([], 'root'), {
      hierarchy: [],
      issues: [],
    });
  });
});
