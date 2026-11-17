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
  assert.match(inventory, /value=\{null\} disabled=\{associatingElementId === source\.id\}/);
  assert.match(inventory, /projectSources\.map\(item => <Option key=\{item\.id\} value=\{item\.id\}/);
  assert.match(details, /selectedDocumentedSource\.description/);
  assert.match(details, /selectedDocumentedSource\.link/);
  assert.match(details, /documented-sources\/\$\{selectedDocumentedSource\.id\}/);
});

test('one project source can be referenced by multiple BPMN elements', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const referenceEntity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSourceReference.ormEntity.ts');
  const migration = await read('../backend/migrations/20261116_v3_project_documented_sources.sql');

  assert.match(controller, /@Post\(':sourceId\/references'\)/);
  assert.match(controller, /if \(existing\.sourceId === sourceId\) return existing/);
  assert.match(referenceEntity, /\['projectId', 'resourceId', 'elementId'\],\s*\{ unique: true \}/);
  assert.match(migration, /UNIQUE \("projectId", "resourceId", "elementId"\)/);
  assert.doesNotMatch(migration, /UNIQUE \("projectId", "sourceId"\)/);
});


test('a canonical documented source can be reused only once per BPMN resource', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /!item\.references\.some\(reference => reference\.resourceId === resourceId\)/);
  assert.match(controller, /sourceAlreadyUsedInDiagram/);
  assert.match(controller, /This documented source is already linked to an object in this BPMN diagram/);
  assert.match(controller, /crossElementDiagramConflict/);
  assert.match(controller, /Fusion impossible : les deux sources sont déjà utilisées par des objets différents dans un même diagramme BPMN/);
});


test('BPMN documented-source associations can be changed or unlinked without deleting either object', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /changeAssociation/);
  assert.match(inventory, /apiClient\.put\([^\n]*\/references\/\$\{reference\.id\}/);
  assert.match(inventory, /apiClient\.remove\([^\n]*\/references\/\$\{reference\.id\}/);
  assert.match(inventory, /Changer la source associée/);
  assert.match(inventory, /Délier/);
  assert.match(controller, /@Put\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async changeReferenceSource/);
  assert.match(controller, /@Delete\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async unlinkReference/);
  assert.match(controller, /referenceRepository\.save\(reference\)/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
});
