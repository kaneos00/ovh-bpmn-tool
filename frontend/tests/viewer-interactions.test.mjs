import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('viewer starts with the minimap hidden and exposes an explicit toggle', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.match(hook, /const \[minimapVisible, setMinimapVisible\] = useState\(false\)/);
  assert.match(hook, /Keep the minimap closed on import/);
  assert.match(component, /onClick=\{\(\) => setMinimapVisible\(!minimapVisible\)\}/);
  assert.ok(hook.includes("minimap?.open?.()"));
  assert.ok(hook.includes("minimap?.close?.()"));
  assert.match(component, /aria-label=\{minimapVisible \? 'Masquer la mini-carte' : 'Afficher la mini-carte'\}/);
});

test('single-click selection is delayed and rapid double-click cancels it', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /eventBus\.on\('element\.click', onElementClick\)/);
  assert.match(hook, /eventBus\.on\('element\.dblclick', onElementDoubleClick\)/);
  assert.match(hook, /now - lastClickAt < 280/);
  assert.match(hook, /setTimeout\(\(\) => \{[\s\S]*?currentlySelected === element\.id \? '' : element\.id[\s\S]*?\}, 220\)/);
  assert.match(hook, /const onElementDoubleClick = \(event: any\) => \{\s*cancelPendingSelection\(\)/);
  assert.match(hook, /eventBus\.off\('element\.click', onElementClick\)/);
  assert.match(hook, /eventBus\.off\('element\.dblclick', onElementDoubleClick\)/);
});

test('selection marker is removed before the next selection is applied', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /if \(previousId\) canvas\.removeMarker\(previousId, 'task-selected'\)/);
  assert.match(hook, /canvas\.addMarker\(targetId, 'task-selected'\)/);
  assert.match(hook, /useEffect\(\(\) => \{\s*applySelectionRef\.current\(\);\s*\}, \[selectedElementId\]\)/);
});

test('viewer delegates called-process navigation to the shared hook', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /import \{ useCallActivityNavigation \} from '[^']*useCallActivityNavigation'/);
  assert.match(hook, /useCallActivityNavigation\(viewer, true\)/);
});

test('detail panel starts collapsed and opens when an element is selected', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /const \[taskPanelCollapsed, setTaskPanelCollapsed\] = useState\(true\)/);
  assert.match(details, /if \(selectedElementId\) setTaskPanelCollapsed\(false\)/);
  assert.match(details, /externalUrl:\s*Array\.from\(element\.attributes\)[\s\S]*?attribute\.localName === 'link'/);
});

test('explorer node selection navigates to the selected resource', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /<FolderTree[\s\S]*?selectedId=\{resourceId\}[\s\S]*?onNodeClick=\{id => navigate\(\`\/\$\{id\}\`\)\}/);
});

test('linked Call Activity opens its target only on double-click and handles missing targets', async () => {
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');

  assert.match(navigation, /eventBus\.on\('element\.dblclick', 1500, navigateToLinkedProcess\)/);
  assert.match(navigation, /type === 'bpmn:CallActivity'/);
  assert.match(navigation, /type === 'bpmn:SubProcess'/);
  assert.match(navigation, /type === 'bpmn:Transaction'/);
  assert.match(navigation, /resolveProcessTarget\(targetId, processInfo\)/);
  assert.match(navigation, /navigate\(\`\/\$\{targetResourceId\}\`\)/);
  assert.match(navigation, /processus cible est absent ou son identifiant BPMN est ambigu/);
  assert.match(navigation, /Accès au processus impossible/);
});

test('explorer exposes tree, recent and favorites views with explicit expand/collapse handlers', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.match(tree, /type ExplorerView = 'tree' \| 'recent' \| 'favorites'/);
  assert.match(tree, /\['tree', 'Arborescence'\]/);
  assert.match(tree, /\['recent', 'Récents'\]/);
  assert.match(tree, /\['favorites', 'Favoris'\]/);
  assert.match(tree, /onExpandItem=\{item => setExpandedNodes/);
  assert.match(tree, /onCollapseItem=\{item => setExpandedNodes/);
});



test('external link indicator is limited to the selected linked Call Activity', async () => {
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');

  assert.ok(navigation.includes("eventBus.on('selection.changed', 1000, showIndicatorForSelectedLinkedElement)"));
  assert.ok(navigation.includes('if (indicatorOverlayId !== undefined)'));
  assert.ok(navigation.includes("bpmnInstance.get('overlays')?.remove?.(indicatorOverlayId)"));
  assert.ok(navigation.includes("indicator.className = 'bpmn-call-activity-link-indicator'"));
  assert.ok(navigation.includes("position: { bottom: -7, right: -8 }"));
  assert.ok(navigation.includes("indicator.addEventListener('click'"));
  assert.ok(navigation.includes("eventBus.off('selection.changed', showIndicatorForSelectedLinkedElement)"));
});

test('external task URL is rendered as a safe external link in the documentation section', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes('selectedTask.externalUrl ? ('));
  assert.ok(details.includes('href={selectedTask.externalUrl.startsWith'));
  assert.ok(details.includes('target="_blank"'));
  assert.ok(details.includes('rel="noopener noreferrer"'));
});


test('minimap internal open/close control is hidden while the toolbar toggle remains available', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.match(css, /\.djs-minimap \.toggle\s*\{[^}]*display:\s*none\s*!important;/s);
  assert.ok(component.includes('Mini-carte'));
  assert.ok(component.includes('setMinimapVisible(visible => !visible)'));
});

test('data references are selectable and task URLs open on double-click', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.ok(hook.includes("element.type === 'bpmn:DataStoreReference'"));
  assert.ok(hook.includes("element.type === 'bpmn:DataObjectReference'"));
  assert.ok(hook.includes("const isTaskWithUrl ="));
  assert.ok(hook.includes("window.open(normalizedUrl, '_blank', 'noopener,noreferrer')"));
});

test('task, subprocess and Call Activity arrows share the bottom-right position and are clickable', async () => {
  const urlModule = await read('src/extensions/url-click-module.ts');
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.match(urlModule, /position:\s*\{\s*bottom:\s*-7,\s*right:\s*-8/s);
  assert.match(navigation, /position:\s*\{ bottom: -7, right: -8 \}/);
  assert.ok(navigation.includes("indicator.addEventListener('click'"));
  assert.ok(!urlModule.includes('bpmn-subprocess-link'));
  assert.match(css, /\.djs-overlay \.bjs-drilldown:not\(\.url-link-overlay\)\s*\{[^}]*display:\s*none\s*!important;/s);
  assert.match(css, /\.bpmn-call-activity-link-indicator\s*\{[^}]*pointer-events:\s*auto/s);
});

test('explorer remembers the selected tab and highlights linked-process resources by target ID', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(tree.includes("const VIEW_KEY = 'bpmn-tool:explorer-view'"));
  assert.ok(tree.includes('const readView = (): ExplorerView'));
  assert.ok(tree.includes('window.localStorage.setItem(VIEW_KEY, view)'));
  assert.ok(tree.includes('const isSelected = (node.targetId ?? node.id) === selectedId'));
  assert.ok(tree.includes('selectedTreeNodeId'));
});

test('viewer serializes imports and covers the previous canvas during navigation', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.ok(hook.includes('importGenerationRef'));
  assert.ok(hook.includes('importQueueRef.current'));
  assert.ok(hook.includes('const clearViewerAfterQueuedImports = () =>'));
  assert.ok(hook.includes('importQueueRef.current = clearTask'));
  assert.ok(component.includes('process-viewer-loading'));
  assert.match(css, /\.process-viewer-loading\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
});
