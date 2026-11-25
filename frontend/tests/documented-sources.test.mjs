import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('documented information table keeps the validated column order', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const headers = [
    "headerName: 'Type'",
    "textColumn('name', 'Nom'",
    "textColumn('description', 'Description'",
    "headerName: 'Données personnelles'",
    "headerName: 'Objet BPMN'",
    "textColumn('link', 'Lien'",
    "textColumn('location', 'Emplacement'",
    "textColumn('access', 'Accès'",
    "textColumn('retention', 'Durée de conservation'",
    "headerName: 'Date limite de validité'",
    "textColumn('authorizedPeople', 'Personnes autorisées'",
    "textColumn('restrictions', 'Restrictions'",
  ];
  const positions = headers.map(header => inventory.indexOf(header));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test('validity limit is optional, editable with a date picker and persisted as a date', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const projectGrid = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const migration = await read('../backend/migrations/20261118_v3_project_documented_source_validity.sql');

  assert.match(inventory, /field: 'validUntil'/);
  assert.match(inventory, /cellEditor: 'agDateStringCellEditor'/);
  assert.match(inventory, /valueFormatter: params => params\.value \|\| 'Illimitée'/);
  assert.match(inventory, /validUntil: row\.validUntil \|\| null/);
  assert.match(projectGrid, /headerName: 'Date limite de validité', field: 'validUntil'/);
  assert.match(entity, /@Column\(\{ type: 'date', nullable: true \}\)\s+validUntil: string \| null/);
  assert.match(controller, /optionalDate\(body\.validUntil\)/);
  assert.match(controller, /!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(value\)/, 'validity date must use digit escapes rather than a literal backslash');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "validUntil" date/);
});

test('source types are File, Database and Application, with Tool normalized to Application', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(inventory, /type SourceKind = 'file' \| 'database' \| 'application'/);
  assert.match(inventory, /values: \['file', 'database', 'application'\]/);
  assert.match(inventory, /file: 'Fichier'/);
  assert.match(inventory, /database: 'Base de données'/);
  assert.match(inventory, /application: 'Application'/);
  assert.match(inventory, /kind === 'application' \|\| kind === 'form'/);
});

test('a documented information row can be created before it has a BPMN association', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /const addRow = \(\) =>/);
  assert.match(inventory, /const id = `new-\$\{Date\.now\(\)\}`/);
  assert.match(inventory, /setSources\(current => \[\.\.\.current, emptySource\(id\)\]\)/);
  assert.match(inventory, /if \(row\.id\.startsWith\('new-'\)\)/);
  assert.match(inventory, /apiClient\.post\(\`\/projects\/\$\{projectId\}\/documented-sources\`, payload\)/);
  assert.match(controller, /const hasReferenceFields = Boolean\(/);
  assert.match(controller, /const reference = hasReferenceFields/);
  assert.match(controller, /if \(!reference\) return \{ \.\.\.source, references: \[\] \}/);
});

test('legacy BPMN documented metadata can be imported from the process inventory', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  assert.match(inventory, /Objets BPMN non inscrits au référentiel/);
  assert.match(inventory, /const importLegacyReference = async/);
  assert.match(inventory, /description: reference\.description \?\? ''/);
  assert.match(inventory, /authorizedPeople: reference\.authorizedPeople \?\? ''/);
  assert.match(inventory, /resourceId: reference\.resourceId/);
  assert.match(inventory, /elementType: reference\.elementType/);
});

test('BPMN associations are limited to unlinked data objects and stores in the active process', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(inventory, /filter\(reference => reference\.resourceId === resourceId\)/);
  assert.match(inventory, /unlinkedReferences\.find\(item => item\.elementId === elementId\)/);
  assert.match(inventory, /elementType: reference\.elementType/);
  assert.match(inventory, /type BpmnDataType = 'dataObjectReference' \| 'dataStoreReference'/);
});

test('unlinking a BPMN object removes only its reference, not the documented source', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /apiClient\.remove\(\`\/projects\/\$\{projectId\}\/documented-sources\/\$\{row\.id\}\/references\/\$\{reference\.id\}\`\)/);
  assert.match(controller, /@Delete\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async unlinkReference/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
});

test('documented information rows keep their leading selection checkboxes and search focus', async () => {
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(grid, /rowSelection=\{\{ mode: 'singleRow', checkboxes: true, enableClickSelection: true \}\}/);
  assert.match(grid, /event\.api\.ensureNodeVisible\(node, 'middle'\)/);
  assert.match(inventory, /selectedRowId=\{requestedDocumentedSourceId \?\? undefined\}/);
});
