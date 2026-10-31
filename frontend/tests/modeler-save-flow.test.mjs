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

  assert.match(container, /if (actionData.error) {[\\s\\S]*?return;/);
  assert.match(container, /if (actionData.formAction === 'saveContent')[\\s\\S]*?return;[\\s\\S]*?navigate/);
  assert.doesNotMatch(container, /<Navigate/);
  assert.match(action, /await Promise.all([\\s\\S]*?getXmlContentQuery/);
});

test('failed publication stays on the confirmation screen for retry', async () => {
  const container = await read('src/Containers/PublishResource/PublishResource.container.tsx');

  assert.match(container, /actionData && !actionData.error/);
  assert.match(container, /failed publication must remain on the confirmation screen/);
});
