import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('viewer panels share flex sizing and preserve the collapsed detail border', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayoutContainer.scss');

  assert.match(details, /\.processViewerLayout\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1 1 0;/s);
  assert.match(details, /\.processViewerProcessTab\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*min-height:\s*0;[^}]*height:\s*100%;/s);
  assert.match(details, /\.processViewerWorkspace\s*\{[^}]*align-items:\s*stretch;[^}]*overflow:\s*hidden;/s);
  assert.match(details, /\.processExplorerPanel\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s);
  assert.match(details, /\.processTaskPanel\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s);

  const collapsedDetailPanel = details.match(/\.processTaskPanel\.collapsed\s*\{([^}]*)\}/s);
  assert.ok(collapsedDetailPanel, 'collapsed detail panel rule should exist');
  assert.match(collapsedDetailPanel[1], /width:\s*44px/);
  assert.match(layout, /&\.processViewerActive\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
});

test('all five BPMN gateway types map to markers styled with the same violet stroke', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const modelerCss = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const gateways = [
    ['ExclusiveGateway', 'exclusive'],
    ['ParallelGateway', 'parallel'],
    ['InclusiveGateway', 'inclusive'],
    ['ComplexGateway', 'complex'],
    ['EventBasedGateway', 'event-based'],
  ];

  for (const [type, marker] of gateways) {
    assert.match(viewer, new RegExp(`bpmn:${type}[^\\n]*\\n\\s*canvas\\.addMarker\\(element\\.id, 'bpmn-gateway-${marker}'\\)`));
    assert.ok(modelerCss.includes(`.djs-element.bpmn-gateway-${marker} .djs-visual > *`), `missing shared gateway style for ${type}`);
  }

  const sharedGatewayStyle = modelerCss.match(/\/\* All gateways share a dark-purple outline[\s\S]*?\*\/([\s\S]*?)(?=\/\*|$)/);
  assert.ok(sharedGatewayStyle, 'shared gateway style block should exist');
  assert.match(sharedGatewayStyle[1], /stroke:\s*#6a0dad\s*!important;/i);
  assert.doesNotMatch(sharedGatewayStyle[1], /fill\s*:/i, 'gateway outline styling must not replace the gateway fill');
});


test('called-process tree resolution is unambiguous, deduplicated and cycle-safe', async () => {
  const links = await read('src/Components/BusinessComponents/FolderTree/processLinks.ts');
  const tree = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');

  assert.ok(links.includes("getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity')"));
  assert.ok(links.includes("element.getAttribute('calledElement')?.trim() || ''"));
  assert.ok(links.includes("element.getAttribute('isExpanded') === 'false'"));
  assert.ok(links.includes('matches.length === 1 && !byIdentifier.has(processId)'));
  assert.ok(links.includes('const targets = Array.from(new Set(info.targets))'));
  assert.ok(links.includes('target.id !== info.resource.id'));
  assert.ok(links.includes('!parentByTarget.has(target.id) && !reaches(target.id, info.resource.id)'));
  assert.ok(tree.includes('linked-process:'));
});

test('explorer folder-label selection opens one level without collapsing other branches', async () => {
  const explorer = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(explorer.includes('const handleTreeSelection = (items: (string | number)[]) =>'));
  assert.ok(explorer.includes("if (node.type === 'folder')"));
  assert.ok(explorer.includes('current.includes(node.id) ? current : [...current, node.id]'));
  assert.ok(explorer.includes('onNodeClick(node.targetId ?? selected)'));
  assert.ok(explorer.includes('return;'), 'folder clicks must expand in place without navigating away');

  const treeHook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
  assert.ok(treeHook.includes('resource.type === ResourceType.Folder'));
  assert.match(treeHook, /resource\.type === ResourceType\.Folder\s*\?\s*resource\.id/);
  assert.ok(treeHook.includes('getFolderHierarchy(hierarchyResourceId).map(({ id }) => id)'));
});


test('explorer delegates Call Activity and collapsed SubProcess links to the tested resolver', async () => {
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
  const processLinks = await read('src/Components/BusinessComponents/FolderTree/processLinks.ts');

  assert.match(hook, /import \{ getProcessLinks, resolveLinkedChildren \} from '\.\.\/processLinks'/);
  assert.match(hook, /return resolveLinkedChildren\(processInfo\)/);
  assert.ok(processLinks.includes("getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity')"));
  assert.match(
    processLinks,
    /getElementsByTagNameNS\(BPMN_MODEL_NS, 'subProcess'\)[\s\S]*?filter\(element => element\.getAttribute\('isExpanded'\) === 'false'\)/,
  );
});

test('viewer mounts a single FolderTree explorer instead of the legacy ResourceExplorer', async () => {
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const routes = await read('src/routes.tsx');

  assert.ok(layout.includes("import { FolderTree } from '../../Components/BusinessComponents/FolderTree'"));
  assert.ok(layout.includes('<FolderTree'));
  assert.ok(!layout.includes('ResourceExplorer'));
  assert.ok(details.includes("import { FolderTree } from '../FolderTree'"));
  assert.ok(details.includes('<FolderTree'));
  assert.ok(!details.includes('ResourceExplorer'));
  assert.ok(routes.includes("lazy: () => import('./Containers/BpmnLayout')"));
});


test('breadcrumb ancestry shares the tree resource snapshot and detects broken parent chains', async () => {
  const folders = await read('src/shared/hooks/useFolders.ts');
  const hierarchy = await read('src/shared/helpers/folderHierarchy.ts');
  const breadcrumbs = await read('src/Containers/BpmnLayout/hooks/useBpmnLayoutBreadcrumbs.ts');

  assert.ok(folders.includes('useQuery<Resource[]>(resourcesQuery())'));
  assert.ok(folders.includes('resolveFolderHierarchy(folders, folderId)'));
  assert.ok(folders.includes('inspectFolderHierarchy'));
  assert.ok(breadcrumbs.includes("resource.parentId ?? 'root'"));
  assert.ok(hierarchy.includes("code: 'missing-parent'"));
  assert.ok(hierarchy.includes("code: 'cycle'"));
  assert.ok(hierarchy.includes("code: 'depth-mismatch'"));
  assert.ok(hierarchy.includes('hierarchy.length = 0'));
});

test('folder navigation does not rely on the stored depth field for breadcrumb ordering', async () => {
  const hierarchy = await read('src/shared/helpers/folderHierarchy.ts');
  const hook = await read('src/shared/hooks/useFolders.ts');

  assert.ok(hierarchy.includes('const expectedDepth = parent.depth + 1'));
  assert.ok(hierarchy.includes('return { hierarchy: hierarchy.reverse(), issues }'));
  assert.ok(hook.includes('return [getRootResource(), ...(hierarchy as Resource[])]'));
});


test('Start/End events and data references keep their semantic markers and styles', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const urlModule = await read('src/extensions/url-click-module.ts');

  assert.match(viewer, /element\?\.type === 'bpmn:StartEvent'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-start-event'\)/);
  assert.match(viewer, /element\?\.type === 'bpmn:EndEvent'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-end-event'\)/);
  assert.match(css, /\.djs-element\.bpmn-start-event \.djs-visual > circle\s*\{[^}]*stroke:\s*#2e7d32\s*!important;/s);
  assert.match(css, /\.djs-element\.bpmn-end-event \.djs-visual > circle\s*\{[^}]*stroke:\s*#c62828\s*!important;/s);
  assert.ok(css.includes('.djs-element.bpmn-data-store .djs-visual > rect'));
  assert.ok(css.includes('.djs-element.bpmn-data-object-reference .djs-visual > rect'));
  assert.ok(css.includes('fill: #fff0d6'));
  assert.ok(css.includes('stroke: #ed8b00'));
  assert.ok(urlModule.includes("is(element, 'bpmn:DataStoreReference')"));
  assert.ok(urlModule.includes("is(element, 'bpmn:DataObjectReference')"));
  assert.match(urlModule, /position:\s*\{\s*bottom:\s*-7,\s*right:\s*-8/s);
});
