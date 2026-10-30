import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

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
  const controller = await read('backend/src/modules/ResourceContext/infrastructure/controllers/resource.controller.ts');
  const routeStart = controller.indexOf("@Get('/explorer/links')");
  const routeEnd = controller.indexOf("@Get('/:resourceId')", routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart, 'explorer endpoint must be registered before the resource ID route');

  const route = controller.slice(routeStart, routeEnd);
  const accessFilter = route.indexOf('filterReadableResources');
  const metadataQuery = route.indexOf('explorerLinksQueryHandler.execute');
  assert.ok(accessFilter >= 0, 'resource visibility must be checked');
  assert.ok(metadataQuery > accessFilter, 'BPMN link metadata must only be requested for readable resources');
  assert.match(route, /filter\(resource => resource\.type === ResourceTypeEnum\.Process\)/);
  assert.match(route, /resources: readableResources\.map\(ResourceMapper\.toPresenter\)/);
});

test('explorer endpoint is a single batched metadata request, not a per-process XML download', async () => {
  const repository = await read('backend/src/modules/ResourceContext/infrastructure/repositories/typeorm/content.repository.ts');
  const query = repository.slice(
    repository.indexOf('async findExplorerProcessLinks'),
    repository.indexOf('\n  async find(', repository.indexOf('async findExplorerProcessLinks')),
  );

  assert.match(query, /if \(!resourceIds\.length\) return ok\(\[\]\)/);
  assert.match(query, /this\.contentRepository\.query\(/);
  assert.match(query, /ANY\(\$1::uuid\[\]\)/);
  assert.match(query, /xpath\(/);
  assert.doesNotMatch(query, /getXmlContent|findOne\(/);
});
