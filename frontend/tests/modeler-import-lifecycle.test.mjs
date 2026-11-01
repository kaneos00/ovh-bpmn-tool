import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('all editor XML imports share one queue per Modeler instance', async () => {
  const queue = await read('src/shared/utils/modelerImportQueue.ts');
  const modeler = await read('src/Containers/ContentModeler/hooks/useModeler.ts');
  const contentModeler = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');

  assert.match(queue, /WeakMap<Modeler, Promise<void>>/);
  assert.match(queue, /previous\.catch\(\(\) => undefined\)\.then\(operation\)/);
  assert.match(modeler, /enqueueModelerImport\(bpmnModelerInstance/);
  assert.match(contentModeler, /enqueueModelerImport\(bpmnModelerInstance/);
  assert.ok(!modeler.includes('importQueueRef'));
});

test('uploaded BPMN files are read before entering the instance import queue', async () => {
  const contentModeler = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');

  assert.match(contentModeler, /const file = files\.item\(0\)/);
  assert.match(contentModeler, /const processContent = await file\.text\(\)/);
  assert.match(contentModeler, /await enqueueModelerImport\(bpmnModelerInstance, async \(\) =>/);
});
