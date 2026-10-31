import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('modeler save-and-publish navigates only after a successful draft save', async () => {
  const container = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const action = await read('src/Containers/ContentModeler/ContentModeler.action.ts');

  assert.ok(container.includes('if (actionData.error)'));
  assert.ok(container.includes("if (actionData.formAction === 'saveContent')"));
  assert.ok(container.includes('navigate('));
  assert.ok(!container.includes('<Navigate'));
  assert.ok(action.includes('await Promise.all(['));
  assert.ok(action.includes('getXmlContentQuery(resourceId, contentId)'));
});

test('failed publication stays on the confirmation screen for retry', async () => {
  const container = await read('src/Containers/PublishResource/PublishResource.container.tsx');

  assert.match(container, /actionData && !actionData.error/);
  assert.match(container, /failed publication must remain on the confirmation screen/);
});
