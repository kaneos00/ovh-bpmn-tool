import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('project workspace restores the central documented information tab', async () => {
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');
  const registry = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  assert.match(overview, /<Tab value="documented">Informations documentées<\/Tab>/);
  assert.match(overview, /<ProjectDocumentedSources projectId=\{activeProjectId!\}/);
  for (const column of ['Type', 'Nom', 'Description', 'Objet BPMN', 'Statut projet', 'Lien', 'Emplacement', 'Accès', 'Date limite de validité', 'Personne autorisée', 'Restrictions']) {
    assert.ok(registry.includes(`headerName: '${column}'`), `missing column ${column}`);
  }
  assert.match(registry, /Ajouter une ligne/);
  assert.match(registry, /onCellValueChanged/);
  assert.match(registry, /navigate\(\`\/\$\{ref\.resourceId\}\?elementId=/);
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
