import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('new documented BPMN references can be edited before creating a project source', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(inventory, /canEdit && \(linked \|\| canManageSources\)/);
  assert.match(inventory, /Préparer la création de la source/);
  assert.match(inventory, /<Input size="sm" value=\{source\.name\}/);
  assert.match(inventory, /aria-label="Type de source"/);
  assert.match(inventory, /<Option value="application">Application<\/Option>/);
  assert.match(inventory, /<Option value="form">Formulaire<\/Option>/);
  assert.match(inventory, /!linked && canManageSources && editing && <Button/);
  assert.match(inventory, /onClick=\{\(\) => void createCanonicalSource\(source\)\}/);
});

test('documented source creation and association remain project-scoped and preserve metadata', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(inventory, /documented-sources\/\$\{sourceId\}\/references/);
  assert.match(inventory, /documented-sources`/);
  assert.match(inventory, /elementName: source\.elementName \|\| source\.name/);
  assert.match(inventory, /description: source\.description/);
  assert.match(inventory, /link: source\.link/);
  assert.match(inventory, /location: source\.location/);
  assert.match(inventory, /retention: source\.retention/);
  assert.match(details, /selectedDocumentedSource\.description/);
  assert.match(details, /selectedDocumentedSource\.link/);
  assert.match(details, /documented-sources\/\$\{selectedDocumentedSource\.id\}/);
});
