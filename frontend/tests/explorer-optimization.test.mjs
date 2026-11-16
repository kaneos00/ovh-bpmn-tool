import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('explorer follows the process currently open instead of retaining an unrelated active project', async () => {
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const treeType = await read('src/Components/BusinessComponents/FolderTree/index.ts');
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.match(hook, /if \(matchingProjects\.length === 1\) return matchingProjects\[0\]/);
  assert.match(hook, /matchingProjects\.find\(project => project\.id === activeProject\?\.id\) \?\? null/);
  assert.match(hook, /activeProject: projectForTree/);
  assert.match(layout, /matchingProjects\.length === 1[\s\S]*?setActiveProject\(matchingProjects\[0\]\.id\)/);
  assert.match(treeType, /usage\?: 'common' \| 'variant' \| 'project-specific'/);
  assert.match(tree, /node\?\.usage === 'variant'/);
});

test('explorer provides root-level creation actions without requiring a folder selection', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.match(tree, /navigate\('\/root\/add\?type=folder'\)/);
  assert.ok(tree.includes('navigate(`/root/add?type=process&projectId=${encodeURIComponent(activeProjectId)}`)'));
});

test('explorer loads its resource snapshot and BPMN link metadata through one API request', async () => {
  const queries = await read('src/api/resources/resources.queries.ts');
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');

  assert.match(queries, /export const explorerQuery = \(\) => \(\{[\s\S]*?queryKey: \[QUERY_KEY, 'explorer'\][\s\S]*?apiClient\.get\('\/resources\/explorer\/links'\)/);
  assert.match(hook, /useQuery\(explorerQuery\(\)\)/);
  assert.match(hook, /explorerData\?\.resources/);
  assert.match(hook, /explorerData\?\.links/);
  assert.doesNotMatch(hook, /contentsQuery|getXmlContentQuery|getProcessLinks/);
});

test('explorer link API filters resources by read permissions before requesting process metadata', async () => {
  const controller = await read('../backend/src/modules/ResourceContext/infrastructure/controllers/resource.controller.ts');
  const routeStart = controller.indexOf("@Get('/explorer/links')");
  const routeEnd = controller.indexOf("@Get('/:resourceId')", routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart, 'explorer endpoint must be registered before the resource ID route');

  const route = controller.slice(routeStart, routeEnd);
  const accessFilter = route.indexOf('filterReadableResources');
  const metadataQuery = route.indexOf('explorerLinksQueryHandler.execute');
  assert.ok(accessFilter >= 0, 'resource visibility must be checked');
  assert.ok(metadataQuery > accessFilter, 'BPMN link metadata must only be requested for readable resources');
  assert.match(route, /filter\(\(resource\) => resource\.type === ResourceTypeEnum\.Process\)/);
  assert.match(route, /resources: readableResources\.map\(ResourceMapper\.toPresenter\)/);
});

test('explorer endpoint is a single batched metadata request, not a per-process XML download', async () => {
  const repository = await read('../backend/src/modules/ResourceContext/infrastructure/repositories/typeorm/content.repository.ts');
  const query = repository.slice(
    repository.indexOf('async findExplorerProcessLinks'),
    repository.indexOf('\n  async find(', repository.indexOf('async findExplorerProcessLinks')),
  );

  assert.match(query, /if \(!resourceIds\.length\) return ok\(\[\]\)/);
  assert.match(query, /this\.contentRepository\.query\(/);
  assert.match(query, /ANY\(\$1::uuid\[\]\)/);
  assert.match(query, /xpath\(/);
  assert.match(query, /xml_is_well_formed_document\(content\)/);
  assert.match(query, /ELSE '<definitions \/>'::xml/);
  assert.doesNotMatch(query, /getXmlContent|findOne\(/);
});


test('shared root folders remain visible without an active project and alongside project processes', async () => {
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');

  assert.match(hook, /if \(!effectiveProjectId\) return \(resources \?\? \[\]\)\.filter\(item => item\.type === ResourceType\.Folder\)/);
  assert.match(hook, /Root folders are global navigation nodes/);
  assert.match(hook, /allResources[\s\S]*?filter\(item => item\.type === ResourceType\.Folder\)[\s\S]*?allowedIds\.add\(folder\.id\)/);
  assert.match(hook, /return allResources\.filter\(item => allowedIds\.has\(item\.id\)\)/);
});

test('creating a root folder invalidates both resource and explorer snapshots', async () => {
  const action = await read('src/Containers/AddResource/AddResource.action.ts');

  assert.match(action, /createResource\(resourceData\)/);
  assert.match(action, /queryClient\.invalidateQueries\(\{ queryKey: \[resourceQueryKey\] \}\)/);
  assert.match(action, /queryClient\.invalidateQueries\(\{ queryKey: \[resourceQueryKey, 'explorer'\] \}\)/);
});


test('deleting a process refreshes resource, explorer and project workspace snapshots', async () => {
  const action = await read('src/Containers/DeleteResource/DeleteResource.action.ts');

  assert.match(action, /if \(!targetResourceId\)/);
  assert.match(action, /await deleteResource\(targetResourceId\)/);
  assert.match(action, /queryClient\.invalidateQueries\(\{ queryKey: \[resourceQueryKey\] \}\)/);
  assert.match(action, /queryClient\.invalidateQueries\(\{ queryKey: \[resourceQueryKey, 'explorer'\] \}\)/);
  assert.match(action, /queryClient\.invalidateQueries\(\{ queryKey: \['my-workspace'\] \}\)/);
});


test('project home is a first-level tree item and opens the workspace root', async () => {
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(hook.includes("id: 'project-home'"));
  assert.ok(hook.includes('name: `Accueil — ${projectForTree.name}`'));
  assert.ok(hook.includes("targetId: 'root'"));
  assert.ok(tree.includes("node?.id === 'project-home'"));
  assert.ok(tree.includes("contextMenu?.nodeId === 'project-home'"));
  assert.ok(tree.includes("onNodeClick(targetId)"));
  assert.ok(tree.includes("navigate('/root/add?type=folder')"));
  assert.ok(!tree.includes('Racine — ${activeProject.name}'));
});

test('folder context menu creates child folders and project-linked processes in that folder', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(tree.includes('type=process&projectId=${encodeURIComponent(activeProjectId!)}'));
  assert.ok(tree.includes('Créer un sous-répertoire'));
});
