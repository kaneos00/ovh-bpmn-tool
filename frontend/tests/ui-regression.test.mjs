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
  assert.ok(explorer.includes("if (node.type === 'folder' && node.children?.length)"));
  assert.ok(explorer.includes('current.includes(node.id) ? current : [...current, node.id]'));
  assert.ok(explorer.includes('onNodeClick(node.targetId ?? selected)'));

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

test('breadcrumb hierarchy traversal stops safely when parent IDs form a cycle', async () => {
  const folders = await read('src/shared/hooks/useFolders.ts');

  assert.match(folders, /if \(visited\.has\(resourceId\)\)\s*\{\s*return flatTree;/);
  assert.match(folders, /visited\.add\(resourceId\)/);
  assert.match(folders, /makeFlatHierarchy\(flatTree, folder\.parentId, visited\)/);
});


test('viewer supports data-reference selection and consistent clickable navigation arrows', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const callNavigation = await read('src/shared/hooks/useCallActivityNavigation.ts');
  const urlModule = await read('src/extensions/url-click-module.ts');

  assert.ok(viewer.includes("element.type === 'bpmn:DataStoreReference'"));
  assert.ok(viewer.includes("element.type === 'bpmn:DataObjectReference'"));
  assert.ok(viewer.includes("overlays?.remove?.({ element, type: 'drilldown' })"));

  assert.ok(callNavigation.includes("businessObject?.$type === 'bpmn:SubProcess'"));
  assert.ok(callNavigation.includes('businessObject?.isExpanded === false'));
  assert.ok(callNavigation.includes("eventBus.fire('element.dblclick'"));
  assert.ok(callNavigation.includes('position: { bottom: -7, right: -8 }'));
  assert.ok(callNavigation.includes('currentResourceId, navigate, showAlert'));

  assert.ok(urlModule.includes("eventBus.on('element.dblclick', openTaskUrlOnDoubleClick)"));
  assert.ok(urlModule.includes("if (!is(element, 'bpmn:Task')) return"));
  assert.ok(urlModule.includes("position: { bottom: -7, right: -8 }"));
  assert.ok(urlModule.includes("eventBus.fire('element.dblclick'"));
});


test('explorer preserves Récents and Favoris view when navigation remounts the panel', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(tree.includes("const VIEW_KEY = 'bpmn-tool:explorer-view'"));
  assert.ok(tree.includes('const [view, setView] = useState<ExplorerView>(readView)'));
  assert.ok(tree.includes('window.localStorage.setItem(VIEW_KEY, view)'));
  assert.ok(tree.includes('return value === \'recent\' || value === \'favorites\' ? value : \'tree\''));
});
