import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('documented information table follows the requested column order', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const headers = [
    "headerName: 'Type'",
    "textColumn('name', 'Nom'",
    "textColumn('description', 'Description'",
    "headerName: 'Objet BPMN'",
    "headerName: 'Statut projet'",
    "textColumn('link', 'Lien'",
    "textColumn('location', 'Emplacement'",
    "textColumn('access', 'Accès'",
    "headerName: 'Date limite de validité'",
    "textColumn('authorizedPeople', 'Personnes autorisées'",
    "textColumn('restrictions', 'Restrictions'",
  ];
  const positions = headers.map(header => inventory.indexOf(header));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(inventory, /'Illimitée'/);
});

test('source types are File, Database and Application, with Tool represented by Application', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /type SourceKind = 'file' \| 'database' \| 'application'/);
  assert.match(inventory, /<Option value="file">/);
  assert.match(inventory, /<Option value="database">/);
  assert.match(inventory, /<Option value="application">/);
  assert.match(inventory, /Application \(Tool\)/);
  assert.doesNotMatch(inventory, /<Option value="form">/);
  assert.match(controller, /'application'/);
});

test('new information can be added without an initial BPMN association', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');

  assert.match(inventory, /addLabel="Ajouter une ligne : information documentée"/);
  assert.match(inventory, /const addRow = \(\) =>/);
  assert.match(inventory, /const id = `new-\$\{Date\.now\(\)\}`/);
  assert.match(inventory, /apiClient\.post\(.*documented-sources/);
  assert.match(controller, /const hasReferenceFields = Boolean\(/);
  assert.match(controller, /if \(!reference\) return \{ \.\.\.source, references: \[\] \}/);
  assert.match(grid, /onAdd\?: \(\) => void/);
});

test('BPMN association choices contain only unassociated objects from the current process', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /filter\(reference => reference\.resourceId === resourceId\)/);
  assert.match(inventory, /unlinkedReferences\.map\(item =>/);
  assert.match(inventory, /Associer un objet BPMN/);
  assert.match(inventory, /apiClient\.post\(.*documented-sources\/\$\{row\.id\}\/references/);
  assert.match(controller, /const linkedKeys = new Set/);
  assert.match(controller, /if \(!linkedKeys\.has\(element\.resourceId \+ ':' \+ element\.elementId\)\)/);
});

test('BPMN association can be removed without deleting the documented source', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /Supprimer l’association BPMN/);
  assert.match(inventory, /apiClient\.remove\(.*documented-sources\/\$\{row\.id\}\/references\/\$\{reference\.id\}/);
  assert.match(controller, /@Delete\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async unlinkReference/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
});

test('associated BPMN element opens the diagram with its matching object icon', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(inventory, /BpmnDataSymbol type=\{reference\.elementType\}/);
  assert.match(inventory, /onElementSelect\?\.\(reference\.elementId\)/);
  assert.match(inventory, /onShowDiagram\?\.\(\)/);
  assert.match(details, /onElementSelect=\{elementId => \{ setActiveViewerTab\(0\); onElementSelect\?\.\(elementId\); \}\}/);
});

test('validity limit is optional and persisted as a date', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const migration = await read('../backend/migrations/20261117_v3_project_documented_sources_valid_until.sql');

  assert.match(inventory, /field: 'validUntil'/);
  assert.match(inventory, /'Illimitée'/);
  assert.match(inventory, /validUntil: row\.validUntil \|\| null/);
  assert.match(entity, /@Column\(\{ type: 'date', nullable: true \}\)\s+validUntil: string \| null/);
  assert.match(controller, /optionalDate\(body\.validUntil, 'validUntil'\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "validUntil" date/);
});

test('viewer selection is reapplied after returning from the nested Modeler route', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(viewer, /useLocation/);
  assert.match(viewer, /location\.pathname, location\.search/);
  assert.match(viewer, /secondFrame = window\.requestAnimationFrame/);
  assert.match(viewer, /applySelectionRef\.current\(\)/);
});
