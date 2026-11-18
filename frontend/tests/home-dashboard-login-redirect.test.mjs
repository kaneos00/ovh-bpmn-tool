import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('successful login always resolves the saved home preference through the authenticated root route', async () => {
  const login = await read('src/Containers/Login/Login.container.tsx');
  const routes = await read('src/routes.tsx');

  assert.match(login, /navigate\('\/', \{ replace: true \}\)/);
  assert.doesNotMatch(login, /searchParams\.get\('next'\)/);
  assert.match(routes, /async function resolveHomeLanding\(\)/);
  assert.match(routes, /preferences\?\.homeDashboardEnabled === true\) throw redirect\('\/home'\)/);
  assert.match(routes, /throw redirect\('\/projects'\)/);
  assert.match(routes, /path: '\/',\s*loader: resolveHomeLanding/);
});
