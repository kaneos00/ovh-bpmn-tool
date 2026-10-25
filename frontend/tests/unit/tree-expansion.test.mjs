import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  expandTreeNode,
  toggleTreeNode,
} from '../../.test-dist/Components/BusinessComponents/FolderTree/treeExpansion.js';

describe('folder tree expansion state', () => {
  it('opens only the requested node and preserves every other expanded branch', () => {
    const expanded = ['folder-a', 'folder-c'];
    assert.deepEqual(expandTreeNode(expanded, 'folder-b'), ['folder-a', 'folder-c', 'folder-b']);
  });

  it('does not duplicate an already expanded node when its label is clicked again', () => {
    const expanded = ['folder-a', 'folder-b'];
    assert.deepEqual(expandTreeNode(expanded, 'folder-a'), expanded);
  });

  it('collapses only the requested branch and preserves siblings', () => {
    assert.deepEqual(
      toggleTreeNode(['folder-a', 'folder-b', 'folder-c'], 'folder-b'),
      ['folder-a', 'folder-c'],
    );
  });

  it('expands a collapsed branch without resetting the rest of the tree', () => {
    assert.deepEqual(
      toggleTreeNode(['folder-a', 'folder-c'], 'folder-b'),
      ['folder-a', 'folder-c', 'folder-b'],
    );
  });
});
