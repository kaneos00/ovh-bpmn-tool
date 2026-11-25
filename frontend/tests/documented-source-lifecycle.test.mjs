import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('a documented source can only be deleted when no BPMN reference remains', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  const projectGrid = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  const processGrid = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');
  assert.match(controller, /@Delete\(':sourceId'\)[\s\S]*?async deleteSource/);
  assert.match(controller, /lock: \{ mode: 'pessimistic_write' \}/);
  assert.match(controller, /const referenceCount = await referenceRepository\.count\(/);
  assert.match(controller, /if \(referenceCount > 0\)[\s\S]*?throw new ConflictException/);
  assert.match(controller, /await sourceRepository\.delete\(\{ id: sourceId, projectId \}\)/);
  assert.match(projectGrid, /references\.length === 0[\s\S]*?apiClient\.remove/);
  assert.match(processGrid, /row\.references\.length > 0/);
  assert.match(processGrid, /apiClient\.remove\(\`\/projects/);
});

test('one documented source may be associated with several BPMN elements in one diagram', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  assert.match(controller, /A documented source may be reused by several BPMN elements/);
  assert.doesNotMatch(controller, /sourceAlreadyUsedInDiagram/);
});

test('the project registry exposes merge and keeps the operation inside one project', async () => {
  const projectGrid = await read('src/Components/BusinessComponents/ProcessDetails/ProjectDocumentedSources.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project-documented-source.controller.ts');
  assert.match(projectGrid, /Fusionner avec…/);
  assert.match(projectGrid, /documented-sources.*merge/);
  assert.match(controller, /@Post\(':sourceId\/merge'\)/);
  assert.match(controller, /where: \{ id: targetId, projectId, mergedIntoId: IsNull\(\) \}/);
});
