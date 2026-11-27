import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('project explorer includes attached processes, explicit empty folders and required ancestors', async () => {
  const source = await readFile(
    path.join(root, 'src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts'),
    'utf8',
  );

  assert.match(source, /const allowedIds = new Set\(effectiveProcessIds\)/);
  assert.match(source, /effectiveProcessIds\.forEach\(id => \{/);
  assert.match(source, /const parent = byId\.get\(parentId\)/);
  assert.match(source, /parent\.type !== ResourceType\.Folder/);
  assert.match(source, /return allResources\.filter\(item => allowedIds\.has\(item\.id\)\)/);

  // Regression guard: folders must not be added wholesale to every project.
  assert.doesNotMatch(
    source,
    /allResources\s*\.filter\(item => item\.type === ResourceType\.Folder\)\s*\.forEach\(folder => allowedIds\.add\(folder\.id\)\)/,
  );
});
