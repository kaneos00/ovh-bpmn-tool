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
    "textColumn('name', 'Nom'",
    "headerName: 'Origine'",
    "headerName: 'Type'",
    "textColumn('description', 'Description'",
    "headerName: 'Données personnelles'",
    "headerName: 'Association BPMN'",
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

test('BPMN description is independent from fiche description and follows each live BPMN association', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const projectGrid = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  const processDetails = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /textColumn\('description', 'Description'/);
  assert.match(inventory, /headerName: 'Description BPMN'/);
  assert.match(inventory, /reference\.bpmnDescription/);
  assert.match(inventory, /onSaveBpmnDescription\(reference\.elementId, value\)/);
  assert.match(processDetails, /const saveBpmnDescription = async/);
  assert.match(processDetails, /documentation\.textContent = description/);
  assert.match(processDetails, /onSaveBpmnDescription=\{saveBpmnDescription\}/);
  assert.match(controller, /bpmnDescription: currentElement\?\.bpmnDescription/);
  assert.match(controller, /node\.documentation !== undefined/);
  assert.doesNotMatch(projectGrid, /Description BPMN|Associations BPMN|ref\.bpmnDescription/);
  assert.match(projectGrid, /Toutes les informations documentées du projet/);
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

  assert.match(inventory, /const addSource = async \(\) =>/);
  assert.match(inventory, /apiClient\.post\(\`\/projects\/\$\{projectId\}\/documented-sources\`, \{/);
  assert.match(inventory, /La fiche sera ajoutée au référentiel du projet et rattachée à ce processus/);
  assert.match(inventory, /Son association à un élément BPMN est facultative/);
  assert.match(inventory, /<Button size="sm" onClick=\{\(\) => setAdding\(true\)\}>Créer une information documentée<\/Button>/);
  assert.match(controller, /const hasReferenceFields = Boolean\(/);
  assert.match(controller, /const reference = hasReferenceFields/);
  assert.match(controller, /if \(!reference\) return \{ \.\.\.source, references: \[\] \}/);
});

test('unlinked BPMN objects remain available directly in the association column', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  assert.match(inventory, /placeholder="Associer un Data Object \/ Data Store…"/);
  assert.match(inventory, /unlinkedReferences\.map\(item =>/);
  assert.match(inventory, /const associate = async/);
  assert.match(inventory, /objet\(s\) BPMN disponible\(s\) pour une association dans ce processus/);
  assert.doesNotMatch(inventory, /Objets BPMN non inscrits au référentiel/);
  assert.doesNotMatch(inventory, /const importLegacyReference = async/);
});

test('BPMN associations support data objects and data stores in the active process', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /filter\(reference => reference\.resourceId === resourceId && isSupportedBpmnDataType\(reference\.elementType\)\)/);
  assert.match(inventory, /unlinkedReferences\.find\(item => item\.elementId === elementId\)/);
  assert.match(inventory, /elementType: reference\.elementType/);
  assert.match(inventory, /type BpmnDataType = 'dataObjectReference' \| 'dataStoreReference'/, 'legacy data-object links remain displayable');
  assert.match(inventory, /documented-sources\?resourceId=\$\{encodeURIComponent\(resourceId\)\}/);
  assert.ok(controller.includes("'dataObjectReference'"));
  assert.ok(controller.includes("'dataStoreReference'"));
  assert.match(controller, /@Query\('resourceId'\) requestedResourceId\?: string/);
  assert.match(controller, /Only BPMN data objects and data stores can be associated with documented sources/);
});

test('unlinking a BPMN object removes only its reference, not the documented source', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.match(inventory, /apiClient\.remove\(\`\/projects\/\$\{projectId\}\/documented-sources\/\$\{row\.id\}\/references\/\$\{reference\.id\}\`\)/);
  assert.match(controller, /@Delete\(':sourceId\/references\/:referenceId'\)/);
  assert.match(controller, /async unlinkReference/);
  assert.match(controller, /this\.references\.delete\(\{ id: reference\.id \}\)/);
});

test('documented information grid supports project multi-selection and process single-selection', async () => {
  const grid = await read('src/Components/BusinessComponents/ProcessDetails/DocumentedSourcesGrid.tsx');
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(grid, /rowSelection=\{multiSelect \? \{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true \} : \{ mode: 'singleRow', checkboxes: false, enableClickSelection: true \}\}/);
  assert.match(grid, /event\.api\.ensureNodeVisible\(node, 'middle'\)/);
  assert.match(inventory, /selectedRowId=\{requestedDocumentedSourceId \?\? undefined\}/);
});


test('project-level sources retain independent memberships in one or more processes', async () => {
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSourceProcess.ormEntity.ts');
  const migration = await read('../backend/migrations/20261127_v3_project_level_documented_sources.sql');

  assert.match(inventory, /const payload = \{\s*resourceId,/);
  assert.match(controller, /ProjectDocumentedSourceProcessTypeOrmEntity/);
  assert.match(controller, /memberships\.some\(/);
  assert.ok(controller.includes('sourceId: source.id'));
  assert.ok(controller.includes('membershipRepository.save'));
  assert.ok(controller.includes('resourceId,'));
  assert.match(controller, /processes: sourceProcesses/);
  assert.match(entity, /project_documented_source_processes/);
  assert.match(migration, /project_documented_source_processes_unique/);
  assert.match(migration, /DROP COLUMN IF EXISTS "resourceId"/);
});

test('BPMN associations may cross process boundaries while the documented source keeps its owning process', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const projectGrid = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  assert.ok(controller.includes('if (!reference) return { ...source, references: [] }'));
  assert.doesNotMatch(controller, /source\.resourceId !== reference\.resourceId/);
  assert.doesNotMatch(controller, /target\.resourceId !== reference\.resourceId/);
  assert.ok(controller.includes('await this.validateReference(projectId, body)'));
  assert.ok(controller.includes('Only BPMN data objects and data stores can be associated with documented sources'));
  assert.doesNotMatch(projectGrid, /placeholder="Associer un Data Object \/ Data Store|Ajouter à un processus|Associations BPMN|Description BPMN/);
  assert.ok(controller.includes("@Post(':sourceId/processes')"));
  assert.ok(controller.includes("@Delete(':sourceId/processes/:resourceId')"));
  assert.match(inventory, /Rattacher à une autre information documentée/);
  assert.match(inventory, /targetSourceId: value/);
});

test('saving a BPMN process synchronizes newly added data stores into the project documented-information registry', async () => {
  const modelerHook = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');
  const modelerAction = await read('src/Containers/ContentModeler/ContentModeler.action.ts');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');

  assert.ok(modelerHook.includes('useActiveProject()'));
  assert.ok(modelerHook.includes('process.resourceId === resourceId'));
  assert.ok(modelerHook.includes("projectId: documentedSourcesProjectId ?? ''"));
  assert.ok(modelerAction.includes('/documented-sources/synchronize'));
  assert.ok(modelerAction.includes("['project-documented-sources', projectId]"));
  assert.ok(controller.includes("@Post('synchronize')"));
  assert.ok(controller.includes('extractBpmnDataElements('));
  assert.ok(controller.includes("element.elementType === 'dataStoreReference'"));
  assert.ok(controller.includes("? 'database'"));
  assert.ok(controller.includes(": 'file'"));
  assert.ok(controller.includes('elementType: element.elementType'));
  assert.ok(controller.includes('if (existing) return false'));
  assert.ok(controller.includes('pg_advisory_xact_lock'));
});

test('moving an automatically generated BPMN entry to an existing source removes the redundant row', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/projectDocumentedSource.ormEntity.ts');
  const migration = await read('../backend/migrations/20261127_v3_project_level_documented_sources.sql');
  const projectGrid = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');

  assert.match(entity, /isAutoGenerated: boolean/);
  assert.match(controller, /isAutoGenerated: true/);
  assert.match(controller, /source\.isAutoGenerated = false/);
  assert.match(controller, /remainingReferences/);
  assert.match(controller, /remainingMemberships/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "isAutoGenerated" boolean NOT NULL DEFAULT false/);
  assert.match(inventory, /Rattacher à une autre information documentée/);
  assert.match(inventory, /targetSourceId: value/);
});
