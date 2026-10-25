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
  assert.match(component, /onClick=\{\(\) => setMinimapVisible\(visible => !visible\)\}/);
  assert.match(component, /aria-label=\{minimapVisible \? 'Masquer la mini-carte' : 'Afficher la mini-carte'\}/);
});

test('single-click selection is delayed and rapid double-click cancels it', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /eventBus\.on\('element\.click', onElementClick\)/);
  assert.match(hook, /eventBus\.on\('element\.dblclick', onElementDoubleClick\)/);
  assert.match(hook, /now - lastClickAt < 280/);
  assert.match(hook, /setTimeout\(\(\) => \{[\s\S]*?currentlySelected === element\.id \? '' : element\.id[\s\S]*?\}, 220\)/);
  assert.match(hook, /const onElementDoubleClick = \(event: any\) => \{\s*cancelPendingSelection\(\)/);
  assert.match(hook, /element\?\.type\?\.endsWith\('Task'\)[\s\S]*?window\.open\(normalizedUrl, '_blank', 'noopener,noreferrer'\)/);
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
  assert.match(hook, /useCallActivityNavigation\(viewer, true, resourceId\)/);
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

test('Call Activity and linked collapsed SubProcess navigate only on double-click', async () => {
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');

  assert.match(navigation, /eventBus\.on\('element\.dblclick', 1500, navigateToCalledProcess\)/);
  assert.match(navigation, /businessObject\?\.\$type === 'bpmn:CallActivity'/);
  assert.match(navigation, /businessObject\?\.\$type === 'bpmn:SubProcess'/);
  assert.match(navigation, /businessObject\?\.isExpanded === false/);
  assert.match(navigation, /resourcesQuery\(\{ type: ResourceType\.Process \}\)/);
  assert.match(navigation, /isCallActivity \? businessObject\?\.calledElement/);
  assert.match(navigation, /navigate\(\`\/\$\{targetResourceId\}\`\)/);
  assert.match(navigation, /Cette activité d’appel n’est pas liée à un processus BPMN Tool/);
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

  assert.ok(navigation.includes("eventBus.on('selection.changed', 1000, showIndicatorForSelectedCallActivity)"));
  assert.ok(navigation.includes('if (indicatorOverlayId !== undefined)'));
  assert.ok(navigation.includes('overlays?.remove?.(indicatorOverlayId)'));
  assert.ok(navigation.includes("element.businessObject?.$type !== 'bpmn:CallActivity'"));
  assert.ok(navigation.includes("!String(element.businessObject.calledElement ?? '').trim()"));
  assert.ok(navigation.includes("indicator.className = 'bpmn-call-activity-link-indicator bpmn-selection-arrow-inward'"));
  assert.ok(navigation.includes("indicatorOverlayId = bpmnInstance.get('overlays')?.add?.(element"));
  assert.ok(navigation.includes("eventBus.off('selection.changed', showIndicatorForSelectedCallActivity)"));
});

test('external task URL is rendered as a safe external link in the documentation section', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes('selectedTask.externalUrl ? ('));
  assert.ok(details.includes('href={selectedTask.externalUrl.startsWith'));
  assert.ok(details.includes('target="_blank"'));
  assert.ok(details.includes('rel="noopener noreferrer"'));
});


test('viewer toolbar is the only minimap open/close control', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const styles = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.match(hook, /viewer\.get\('minimap'\)/);
  assert.match(hook, /minimap\?\.open\?\.\(\)/);
  assert.match(hook, /minimap\?\.close\?\.\(\)/);
  assert.match(styles, /\.process-viewer-canvas \.djs-minimap \.toggle\s*\{\s*display: none !important;/);
});


test('viewer serializes imports and covers the previous canvas during navigation', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const styles = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.match(hook, /importGenerationRef = useRef\(0\)/);
  assert.match(hook, /importQueueRef = useRef<Promise<unknown>>\(Promise\.resolve\(\)\)/);
  assert.match(hook, /if \(cancelled \|\| generation !== importGenerationRef\.current\) return/);
  assert.match(hook, /if \(isXmlLoading\)/);
  assert.match(hook, /if \(!hadPreviousDiagram\) clearViewerAfterQueuedImports\(\)/);
  assert.ok(component.includes('className="process-viewer-loading-overlay"'));
  assert.match(styles, /\.process-viewer-loading-overlay\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
});
