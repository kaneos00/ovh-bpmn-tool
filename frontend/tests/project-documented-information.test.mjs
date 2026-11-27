import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('project workspace exposes a pure project-level documented information registry', async () => {
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');
  const registry = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  assert.match(overview, /<Tab value="documented">Informations documentées<\\/Tab>/);
  assert.match(overview, /<ProjectDocumentedSources projectId=\\{activeProjectId!\\}/);
  for (const column of ['Nom', 'Type', 'Description', 'Lien', 'Emplacement', 'Accès', 'Durée de conservation', 'Date limite de validité', 'Données personnelles', 'Personnes autorisées', 'Restrictions']) {
    assert.ok(registry.includes(`headerName: '${column}'`), `missing column ${column}`);
  }
  assert.doesNotMatch(registry, /headerName: 'Processus'|Associations BPMN|Description BPMN|Ajouter à un processus|Associer un Data Object|Rattacher à une fiche existante/);
  assert.doesNotMatch(registry, /source\\.processes|navigate\\(/);
  assert.match(registry, /Toutes les informations documentées du projet/);
  assert.match(registry, /onCellValueChanged/);
  assert.match(registry, /Fusionner/);
  assert.match(inventory, /Rattacher à une autre information documentée/);
  assert.match(inventory, /Associer un Data Object \\/ Data Store/);
  assert.match(inventory, /onSaveBpmnDescription/);
});

test('documented source validity date is persisted without changing retention', async () => {
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const migration = await read('../backend/migrations/20261118_v3_project_documented_source_validity.sql');
  assert.match(entity, /validUntil: string \| null/);
  assert.match(controller, /validUntil: optionalDate\(body\.validUntil\)/);
  assert.match(controller, /source\.validUntil = optionalDate\(body\.validUntil\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "validUntil" date/);
  assert.match(entity, /retention: string \| null/);
});
