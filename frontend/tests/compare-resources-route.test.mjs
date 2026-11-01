import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('legacy cross-resource comparison URL remains a standalone route', async () => {
  const routes = await read('src/routes.tsx');
  const comparison = await read('src/Containers/ContentCompare/hooks/useCompareData.ts');

  assert.match(
    routes,
    /path: '\/compare-resources\/:leftResourceId\/:leftContentId\/:rightResourceId\/:rightContentId'/,
  );
  assert.match(routes, /lazy: \(\) => import\('\.\/Containers\/ContentCompare'\)/);
  assert.match(comparison, /params\.leftResourceId \?\? params\.resourceId/);
  assert.match(comparison, /params\.rightResourceId \?\? params\.resourceId/);
  assert.match(comparison, /getXmlContentQuery\(leftResourceId, leftContentId\)/);
  assert.match(comparison, /getXmlContentQuery\(rightResourceId, rightContentId\)/);
});
