import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { auditFolderHierarchy } from '../../.test-dist/shared/helpers/folderHierarchyAudit.js';

describe('auditFolderHierarchy', () => {
  it('accepts a consistent folder tree', () => {
    assert.deepEqual(auditFolderHierarchy([
      { id: 'folder-a', parentId: null, depth: 0 },
      { id: 'folder-b', parentId: 'folder-a', depth: 1 },
      { id: 'folder-c', parentId: 'folder-b', depth: 2 },
    ]), []);
  });

  it('reports a parent reference that does not resolve to a folder', () => {
    assert.deepEqual(auditFolderHierarchy([
      { id: 'orphan', parentId: 'missing-parent', depth: 3 },
    ]), [{
      type: 'missing-parent',
      resourceId: 'orphan',
      parentId: 'missing-parent',
      actualDepth: 3,
    }]);
  });

  it('reports a stored depth that disagrees with the parent chain', () => {
    assert.deepEqual(auditFolderHierarchy([
      { id: 'top-level', parentId: 'root', depth: 4 },
    ]), [{
      type: 'depth-mismatch',
      resourceId: 'top-level',
      expectedDepth: 0,
      actualDepth: 4,
    }]);
  });

  it('detects parent cycles without recursing indefinitely', () => {
    const issues = auditFolderHierarchy([
      { id: 'folder-a', parentId: 'folder-b', depth: 2 },
      { id: 'folder-b', parentId: 'folder-a', depth: 1 },
    ]);

    assert.equal(issues.length, 2);
    assert.deepEqual(issues.map(issue => issue.type), ['cycle', 'cycle']);
  });
});
