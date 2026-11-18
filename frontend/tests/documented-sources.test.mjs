import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('BPMN DataSources are automatically registered as independent documented information', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const migration = await read('../backend/migrations/20261116_v3_project_documented_sources.sql');

  assert.match(controller, /First discovery of a BPMN DataSource creates an independent documented/);
  assert.match(controller, /originResourceId: resourceId/);
  assert.match(controller, /originElementId: element\.elementId/);
  assert.match(controller, /sourceRepository\.save\(/);
  assert.match(controller, /referenceRepository\.save\(/);
  assert.match(entity, /originResourceId: string \| null/);
  assert.match(entity, /originElementId: string \| null/);
  assert.match(migration, /"originResourceId" uuid/);
  assert.match(migration, /"originElementId" varchar\(255\)/);
});


test('documented information can be created independently of any BPMN element', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(controller, /const hasReferenceFields = Boolean/);
  assert.match(controller, /const reference = hasReferenceFields/);
  assert.match(controller, /if \(!reference\) return \{ \.\.\.source, references: \[\] \}/);
  assert.match(controller, /@Post\(':sourceId\/references'\)/);
});

test('saved BPMN drafts and published versions are reconciled idempotently', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(controller, /status: In\(\[ContentStatusEnum\.Draft, ContentStatusEnum\.Published\]\)/);
  assert.match(controller, /pg_advisory_xact_lock/);
  assert.match(controller, /if \(reference \|\| origin\) return/);
});

test('deleting a BPMN DataSource removes only its association and retains the documented information', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(controller, /A missing BPMN element removes only its association/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
  assert.match(controller, /originResourceId: resourceId/);
  assert.doesNotMatch(controller, /this\.sources\.delete/);
});

test('the process page manages associations only; merge and source editing are deferred to administration', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(inventory, /changeAssociation/);
  assert.match(inventory, /apiClient\.remove\(/);
  assert.match(inventory, /Dissocier/);
  assert.match(inventory, /Associer une information documentée/);
  assert.doesNotMatch(inventory, /Fusionner|Fusionner avec|MergeType|mergeSources/);
  assert.doesNotMatch(inventory, /createCanonicalSource|Créer la source du projet|editingSourceId/);
  assert.doesNotMatch(inventory, /Rétention|retention/);
});

test('associations remain project-scoped and can be changed or removed without deleting the source', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /documented-sources\/\$\{sourceId\}\/references/);
  assert.match(inventory, /apiClient\.put\(/);
  assert.match(inventory, /apiClient\.remove\(/);
  assert.match(controller, /@Post\(':sourceId\/references'\)/);
  assert.match(controller, /@Put\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /@Delete\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async unlinkReference/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
});

test('only Data Object Reference and Data Store Reference are documented BPMN elements', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /type BpmnDataType = 'dataObjectReference' \| 'dataStoreReference'/);
  assert.match(inventory, /new Set<BpmnDataType>\(\['dataObjectReference','dataStoreReference'\]\)/);
  assert.doesNotMatch(inventory, /'dataInput'|'dataOutput'/);
  assert.match(controller, /const BPMN_DOCUMENTED_DATA_TYPES = new Set\(\[\s*'dataObjectReference',\s*'dataStoreReference',\s*\]\)/);
  assert.doesNotMatch(controller, /'dataInput'|'dataOutput'/);
});


test('documented information supports an optional validity date without retention', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const migration = await read('../backend/migrations/20261118_v3_documented_source_lifecycle.sql');

  assert.match(controller, /const optionalDate/);
  assert.match(controller, /validUntil: optionalDate\(body\.validUntil, 'validUntil'\)/);
  assert.match(controller, /source\.validUntil = optionalDate\(body\.validUntil, 'validUntil'\)/);
  assert.match(entity, /validUntil: string \| null/);
  assert.match(migration, /"validUntil" date/);
  assert.doesNotMatch(controller, /retention/);
  assert.doesNotMatch(await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx'), /retention|Rétention/);
});

test('the documented information grid has integrated filtering and no selection checkboxes', async () => {
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const packageJson = JSON.parse(await read('package.json'));

  assert.match(inventory, /DocumentedSourcesGrid<InventoryGridRow>/);
  assert.match(grid, /from 'ag-grid-react'/);
  assert.match(grid, /AllCommunityModule/);
  assert.match(grid, /rowSelection=\{\{ mode: 'singleRow', enableClickSelection: true \}\}/);
  assert.doesNotMatch(grid, /checkboxes:\s*true/);
  assert.equal(packageJson.dependencies['ag-grid-community'], '33.3.2');
  assert.equal(packageJson.dependencies['ag-grid-react'], '33.3.2');
});
