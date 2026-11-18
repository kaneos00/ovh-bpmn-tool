import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('documented sources expose an editable personal-data checkbox and persist its boolean value', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const migration = await read('../backend/migrations/20261118_v3_project_documented_source_validity.sql');

  assert.match(inventory, /headerName: 'Données personnelles'/);
  assert.match(inventory, /field: 'containsPersonalData'/);
  assert.match(inventory, /cellRenderer: 'agCheckboxCellRenderer'/);
  assert.match(inventory, /cellEditor: 'agCheckboxCellEditor'/);
  assert.match(inventory, /containsPersonalData: row\.containsPersonalData/);
  assert.match(inventory, /handleCellChange\(params, 'containsPersonalData'\)/);
  assert.match(entity, /@Column\(\{ type: 'boolean', default: false \}\)\s+containsPersonalData: boolean/);
  assert.match(controller, /containsPersonalData: optionalBoolean\(body\.containsPersonalData, 'containsPersonalData'\)/);
  assert.match(controller, /source\.containsPersonalData = optionalBoolean\(body\.containsPersonalData, 'containsPersonalData'\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "containsPersonalData" boolean NOT NULL DEFAULT false/);
});

test('merging documented sources never loses a personal-data flag', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  assert.match(controller, /target\.containsPersonalData = target\.containsPersonalData \|\| source\.containsPersonalData/);
});
