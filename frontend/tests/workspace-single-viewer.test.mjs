import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('the project workspace is the only project landing page and Viewer shell', async () => {
  const routes = await read('src/routes.tsx');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const redirect = await read('src/Containers/ProjectWorkspaceRedirect/index.tsx');
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');

  assert.match(routes, /path: '\/'\s*,\s*loader: \(\) => redirect\('\/root'\)/);
  assert.match(routes, /path: '\/home'\s*,\s*loader: \(\) => redirect\('\/root'\)/);
  assert.match(routes, /path: '\/projects\/:projectId\/viewer'[\s\S]*?import\('\.\/Containers\/ProjectWorkspaceRedirect'\)/);
  assert.doesNotMatch(routes, /import\('\.\/Containers\/Home'\)/);
  assert.doesNotMatch(routes, /import\('\.\/Containers\/ProjectViewer'\)/);

  assert.doesNotMatch(navigation, /label: 'Accueil'|label: 'Projets'/);
  assert.match(navigation, /globalRole === 'admin'[\s\S]*?>\s*Administration\s*<\/Button>/);
  assert.ok(navigation.includes('<UserAccountMenu />'), 'account menu remains available');
  assert.doesNotMatch(navigation, /label: 'Référentiel'/);
  assert.match(redirect, /setActiveProject\(projectId\)/);
  assert.match(redirect, /navigate\('\/root', \{ replace: true \}\)/);

  assert.match(overview, /ProjectProcessOverview/);
  assert.match(overview, /apiClient\.put\('\/projects\/' \+ activeProjectId/);
});

test('project breadcrumbs omit the redundant Referentiel level and Home landing page', async () => {
  const breadcrumbs = await read('src/Containers/BpmnLayout/hooks/useBpmnLayoutBreadcrumbs.ts');

  assert.doesNotMatch(breadcrumbs, /label: 'Référentiel'/);
  assert.doesNotMatch(breadcrumbs, /to: '\/home'/);
  assert.match(breadcrumbs, /label: activeProject\.name/);
  assert.match(breadcrumbs, /treePath\.filter\(node => node\.id !== 'root'\)/);
});
