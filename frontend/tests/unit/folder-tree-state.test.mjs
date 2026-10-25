import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EXPANDED_NODES_STORAGE_KEY,
  addExpandedNode,
  mergeExpandedNodes,
  readExpandedNodeIds,
  removeExpandedNode,
} from '../../.test-dist/Components/BusinessComponents/FolderTree/treeState.js';

describe('folder expansion state', () => {
  it('adds one branch without collapsing or duplicating previously expanded branches', () => {
    assert.deepEqual(addExpandedNode(['a', 'b'], 'c'), ['a', 'b', 'c']);
    assert.deepEqual(addExpandedNode(['a', 'b'], 'a'), ['a', 'b']);
  });

  it('collapses only the requested branch', () => {
    assert.deepEqual(removeExpandedNode(['a', 'b', 'c'], 'b'), ['a', 'c']);
  });

  it('merges selected ancestors with existing expansions in stable order', () => {
    assert.deepEqual(mergeExpandedNodes(['open-a', 'open-b'], ['root', 'open-a', 'selected']), [
      'open-a',
      'open-b',
      'root',
      'selected',
    ]);
  });

  it('restores valid persisted IDs and removes duplicates and invalid values', () => {
    const storage = {
      getItem: key => key === EXPANDED_NODES_STORAGE_KEY
        ? '["folder-a","folder-b","folder-a",7,null]'
        : null,
    };
    assert.deepEqual(readExpandedNodeIds(storage), ['folder-a', 'folder-b']);
  });

  it('fails safely when local storage contains malformed JSON or throws', () => {
    assert.deepEqual(readExpandedNodeIds({ getItem: () => '{broken' }), []);
    assert.deepEqual(readExpandedNodeIds({ getItem: () => { throw new Error('blocked'); } }), []);
  });
});
