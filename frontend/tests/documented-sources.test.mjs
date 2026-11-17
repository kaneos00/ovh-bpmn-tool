import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('new documented BPMN references can be selected and created from the reusable grid', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(inventory, /onAdd=\{canManageSources \?/);
  assert.match(inventory, /addLabel="Créer la source du projet"/);
  assert.match(inventory, /editable: \(params: EditableCallbackParams<InventoryGridRow>\) => Boolean\(params\.data && editingSourceId === params\.data\.id\)/);
  assert.match(inventory, /if \(!linked\) \{ await createCanonicalSource\(source\); return; \}/);
  assert.match(inventory, /onEdit=\{canEdit \?/);
  assert.match(inventory, /setEditingSourceId\(row\.id\)/);
  assert.match(inventory, /cellEditor: 'agSelectCellEditor'/);
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
  assert.match(inventory, /value=\{null\} disabled=\{associatingElementId === row\.id\}/);
  assert.match(inventory, /projectSources\.filter/);
  assert.match(inventory, /\.map\(item => <Option key=\{item\.id\} value=\{item\.id\}/);
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
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /changeAssociation/);
  assert.match(inventory, /apiClient\.put\([^\n]*\/references\/\$\{reference\.id\}/);
  assert.match(inventory, /apiClient\.remove\([^\n]*\/references\/\$\{reference\.id\}/);
  assert.match(inventory, /Changer la source…/);
  assert.match(grid, /Supprimer le lien/);
  assert.match(controller, /@Put\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async changeReferenceSource/);
  assert.match(controller, /@Delete\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async unlinkReference/);
  assert.match(controller, /referenceRepository\.save\(reference\)/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
});


test('documented information only offers Data Object Reference and Data Store Reference BPMN elements', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /type BpmnDataType = 'dataObjectReference' \| 'dataStoreReference'/);
  assert.match(inventory, /new Set<BpmnDataType>\(\['dataObjectReference','dataStoreReference'\]\)/);
  assert.match(inventory, /dataTypes\.has\(element\.localName as BpmnDataType\)/);
  assert.doesNotMatch(inventory, /'dataInput'|'dataOutput'/);
  assert.match(controller, /const BPMN_DOCUMENTED_DATA_TYPES = new Set\(\[\s*'dataObjectReference',\s*'dataStoreReference',\s*\]\)/);
  assert.match(controller, /const supported = new Set\(\['dataObjectReference', 'dataStoreReference'\]\)/);
  assert.doesNotMatch(controller, /'dataInput'|'dataOutput'/);
  assert.match(controller, /where: \{ projectId, elementType: In\(\[\.\.\.BPMN_DOCUMENTED_DATA_TYPES\]\) \}/);
});


test('documented information inventory uses a reusable AG Grid with add, edit and unlink actions', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');
  const packageJson = JSON.parse(await read('package.json'));

  assert.match(inventory, /DocumentedSourcesGrid<InventoryGridRow>/);
  assert.match(inventory, /onAdd=\{canManageSources \?/);
  assert.match(inventory, /onEdit=\{canEdit \?/);
  assert.match(inventory, /onDelete=\{canManageSources \?/);
  assert.match(inventory, /apiClient\.remove\([^\n]*\/references\/\$\{reference\.id\}/);
  assert.match(grid, /from 'ag-grid-react'/);
  assert.match(grid, /AllCommunityModule/);
  assert.match(grid, /onAdd\?: \(\) => void/);
  assert.match(grid, /onEdit\?: \(row: T\) => void/);
  assert.match(grid, /onDelete\?: \(row: T\) => void/);
  assert.match(grid, /AddOutlined/);
  assert.match(grid, /EditOutlined/);
  assert.match(grid, /DeleteOutline/);
  assert.equal(packageJson.dependencies['ag-grid-community'], '33.3.2');
  assert.equal(packageJson.dependencies['ag-grid-react'], '33.3.2');
});


test('documented source grid keeps row selection and action controls interactive', async () => {
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');

  assert.match(grid, /rowSelection=\{\{ mode: 'singleRow', enableClickSelection: true \}\}/);
  assert.match(grid, /suppressMouseEventHandling: \(\) => true/);
  assert.match(grid, /onClick=\{event => event\.stopPropagation\(\)\}/);
  assert.match(grid, /onMouseDown=\{event => event\.stopPropagation\(\)\}/);
});
