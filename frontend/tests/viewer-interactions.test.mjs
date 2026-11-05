import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('viewer starts with the minimap hidden and exposes an explicit toggle', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );
  const component = await read(
    'src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx',
  );

  assert.match(
    hook,
    /const \[minimapVisible, setMinimapVisible\] = useState\(false\)/,
  );
  assert.match(hook, /Keep the minimap closed on import/);
  assert.match(
    hook,
    /setIsImporting\(true\);[\s\S]*?setMinimapVisibility\(false\);/,
  );
  assert.match(
    component,
    /onClick=\{\(\) => setMinimapVisible\(!minimapVisible\)\}/,
  );
  assert.ok(hook.includes('minimap?.open?.()'));
  assert.ok(hook.includes('minimap?.close?.()'));
  assert.match(
    component,
    /aria-label=\{minimapVisible \? 'Masquer la mini-carte' : 'Afficher la mini-carte'\}/,
  );
});

test('new element selection is immediate; rapid double-click cancels deselection', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.match(hook, /eventBus\.on\('element\.click', 1500, onElementClick\)/);
  assert.match(
    hook,
    /eventBus\.on\('element\.dblclick', onElementDoubleClick\)/,
  );
  assert.match(hook, /now - lastClickAt < 280/);
  assert.match(
    hook,
    /if \(currentlySelected !== element\.id\) \{\s*onElementSelectRef\.current\?\.\(element\.id\);\s*return;\s*\}/,
  );
  assert.match(hook, /Only delay deselection of an already-selected element/);
  assert.match(
    hook,
    /if \(selectedIdRef\.current === element\.id\) \{\s*onElementSelectRef\.current\?\.\(''\);\s*\}\s*\}, 220\)/,
  );
  assert.match(
    hook,
    /const onElementDoubleClick = \(event: any\) => \{\s*cancelPendingSelection\(\)/,
  );
  assert.match(hook, /eventBus\.off\('element\.click', onElementClick\)/);
  assert.match(
    hook,
    /eventBus\.off\('element\.dblclick', onElementDoubleClick\)/,
  );
});

test('viewer selection recognizes collapsed SubProcesses through their BPMN business-object type', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.match(
    hook,
    /const elementType = element\.businessObject\?\.\$type \?\? element\.type/,
  );
  assert.match(hook, /eventBus\.on\('element\.click', 1500, onElementClick\)/);
  assert.match(hook, /elementType\.startsWith\('bpmn:'\)/);
  assert.match(hook, /!element\.labelTarget/);
  assert.match(hook, /!Array\.isArray\(element\.waypoints\)/);
  assert.match(hook, /onElementSelectRef\.current\?\.\(element\.id\)/);
});

test('BPMN connecting arrows are not selectable in the Viewer', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.match(
    hook,
    /const isConnection\s*=\s*Array\.isArray\(element\.waypoints\)/,
  );
  assert.match(
    hook,
    /sequenceFlow\|messageFlow\|association\|dataInputAssociation\|dataOutputAssociation/,
  );
  assert.match(
    hook,
    /if \(isConnection\) \{[\s\S]*?event\?\.stopPropagation\?\.\(\);[\s\S]*?selection\?\.deselect\?\.\(\[element\]\);[\s\S]*?return;/,
  );
});

test('selection marker is removed before the next selection is applied', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.match(
    hook,
    /if \(previousId\) \{\s*canvas\.removeMarker\(previousId, 'task-selected'\);/,
  );
  assert.match(hook, /canvas\.addMarker\(targetId, 'task-selected'\)/);
  assert.match(
    hook,
    /useEffect\(\(\) => \{\s*applySelectionRef\.current\(\);\s*\}, \[selectedElementId\]\)/,
  );
});

test('viewer delegates called-process navigation to the shared hook', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.match(
    hook,
    /import \{ useCallActivityNavigation \} from '[^']*useCallActivityNavigation'/,
  );
  assert.match(hook, /useCallActivityNavigation\(viewer, true\)/);
});

test('detail panel starts collapsed and opens when an element is selected', async () => {
  const details = await read(
    'src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx',
  );

  assert.match(
    details,
    /const \[taskPanelCollapsed, setTaskPanelCollapsed\] = useState\(true\)/,
  );
  assert.match(
    details,
    /if \(selectedElementId\) setTaskPanelCollapsed\(false\)/,
  );
  assert.match(
    details,
    /externalUrl:\s*Array\.from\(element\.attributes\)[\s\S]*?attribute\.localName === 'link'/,
  );
});

test('shared explorer delegates node selection to the selected-resource navigation callback', async () => {
  const details = await read(
    'src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx',
  );
  const shared = await read(
    'src/Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel.tsx',
  );

  assert.ok(details.includes('onNodeClick={id => navigate(`/${id}`)}'));
  assert.ok(
    shared.includes(
      '<FolderTree selectedId={selectedId} onNodeClick={onNodeClick} />',
    ),
  );
});

test('linked Call Activity opens its target only on double-click and handles missing targets', async () => {
  const navigation = await read(
    'src/shared/hooks/useCallActivityNavigation.ts',
  );

  assert.match(
    navigation,
    /eventBus\.on\('element\.dblclick', 1500, navigateToLinkedProcess\)/,
  );
  assert.ok(
    navigation.includes('const getExternalTaskUrl = (element: any): string =>'),
  );
  assert.ok(
    navigation.includes('const url = getExternalTaskUrl(event.element)'),
  );
  assert.ok(navigation.includes('openExternalUrl(url)'));
  assert.ok(
    !navigation.includes('handleCollapsedSubProcessClickFallback'),
    'SubProcess navigation must not intercept element.click and suppress simple-click selection',
  );
  assert.ok(
    !navigation.includes("eventBus.on('element.click', 1500"),
    'the shared navigation hook must leave single-click events to the Viewer selection handler',
  );
  assert.match(navigation, /type === 'bpmn:CallActivity'/);
  assert.match(navigation, /type !== 'bpmn:SubProcess'/);
  assert.match(navigation, /type !== 'bpmn:Transaction'/);
  assert.match(navigation, /resolveProcessTarget\(targetId, processInfo\)/);
  assert.ok(navigation.includes('const query = explorerQuery()'));
  assert.ok(
    navigation.includes(
      'queryClient.fetchQuery(\n            query.queryKey,\n            query.queryFn,\n            { staleTime: 30_000 },\n          )',
    ),
  );
  assert.ok(
    navigation.includes('explorer.links.map(link => [link.resourceId, link])'),
  );
  assert.ok(
    navigation.includes(
      'processIds: linksByResourceId.get(resource.id)?.processIds ?? []',
    ),
  );
  assert.ok(!navigation.includes('getXmlContentQuery'));
  assert.ok(!navigation.includes('contentsQuery'));
  assert.ok(!navigation.includes('resourcesQuery'));
  assert.match(navigation, /navigate\(\`\/\$\{targetResourceId\}\`\)/);
  assert.match(
    navigation,
    /processus cible est absent ou son identifiant BPMN est ambigu/,
  );
  assert.match(navigation, /Accès au processus impossible/);
});

test('explorer exposes tree, recent and favorites views with explicit expand/collapse handlers', async () => {
  const tree = await read(
    'src/Components/BusinessComponents/FolderTree/FolderTree.tsx',
  );

  assert.match(tree, /type ExplorerView = 'tree' \| 'recent' \| 'favorites'/);
  assert.match(tree, /\['tree', 'Arborescence'\]/);
  assert.match(tree, /\['recent', 'Récents'\]/);
  assert.match(tree, /\['favorites', 'Favoris'\]/);
  assert.match(
    tree,
    /onExpandItem=\{item => \{[\s\S]*?if \(isSearching\) setSearchCollapsedNodes/,
  );
  assert.match(
    tree,
    /onCollapseItem=\{item => \{[\s\S]*?if \(isSearching\) setSearchCollapsedNodes/,
  );
});

test('external link indicator is limited to the selected linked Call Activity', async () => {
  const navigation = await read(
    'src/shared/hooks/useCallActivityNavigation.ts',
  );

  assert.ok(
    navigation.includes(
      "eventBus.on('selection.changed', 1000, showIndicatorForSelectedLinkedElement)",
    ),
  );
  assert.ok(navigation.includes('if (indicatorOverlayId !== undefined)'));
  assert.ok(
    navigation.includes(
      "bpmnInstance.get('overlays')?.remove?.(indicatorOverlayId)",
    ),
  );
  assert.ok(
    navigation.includes(
      "indicator.className = 'bjs-drilldown url-link-overlay bpmn-call-activity-link-indicator'",
    ),
  );
  assert.ok(navigation.includes('position: { bottom: -7, right: -8 }'));
  assert.ok(navigation.includes("indicator.addEventListener('click'"));
  assert.ok(
    navigation.includes(
      "eventBus.off('selection.changed', showIndicatorForSelectedLinkedElement)",
    ),
  );
});

test('external task URL is rendered as a safe external link in the documentation section', async () => {
  const details = await read(
    'src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx',
  );

  assert.ok(
    details.includes('!isEditingDescription && selectedTask.externalUrl && ('),
  );
  assert.ok(details.includes('href={selectedTask.externalUrl.startsWith'));
  assert.ok(details.includes('target="_blank"'));
  assert.ok(details.includes('rel="noopener noreferrer"'));
});

test('minimap internal open/close control is hidden while the toolbar toggle remains available', async () => {
  const css = await read(
    'src/Components/BusinessComponents/Modeler/Modeler.css',
  );
  const component = await read(
    'src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx',
  );

  assert.match(
    css,
    /\.djs-minimap \.toggle\s*\{[^}]*display:\s*none\s*!important;/s,
  );
  assert.ok(component.includes('Mini-carte'));
  assert.ok(
    component.includes('onClick={() => setMinimapVisible(!minimapVisible)}'),
  );
});

test('data references are selectable and task URLs open on double-click', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.ok(hook.includes("element?.type === 'bpmn:DataStoreReference'"));
  assert.ok(hook.includes("element?.type === 'bpmn:DataObjectReference'"));
  assert.ok(hook.includes('const isTaskWithUrl ='));
  assert.ok(
    hook.includes(
      "window.open(normalizedUrl, '_blank', 'noopener,noreferrer')",
    ),
  );
});

test('task, subprocess and Call Activity arrows share the bottom-right position and are clickable', async () => {
  const urlModule = await read('src/extensions/url-click-module.ts');
  const navigation = await read(
    'src/shared/hooks/useCallActivityNavigation.ts',
  );
  const css = await read(
    'src/Components/BusinessComponents/Modeler/Modeler.css',
  );

  assert.match(urlModule, /position:\s*\{\s*bottom:\s*-7,\s*right:\s*-8/s);
  assert.match(navigation, /position:\s*\{ bottom: -7, right: -8 \}/);
  assert.ok(navigation.includes("indicator.addEventListener('click'"));
  assert.ok(!urlModule.includes('bpmn-subprocess-link'));
  assert.match(
    css,
    /\.bjs-drilldown:not\(\.url-link-overlay\)[\s\S]*?display:\s*none\s*!important;/s,
  );
  assert.match(
    css,
    /\.bpmn-call-activity-link-indicator\s*\{[^}]*pointer-events:\s*auto/s,
  );
});

test('explorer remembers the selected tab and highlights linked-process resources by target ID', async () => {
  const tree = await read(
    'src/Components/BusinessComponents/FolderTree/FolderTree.tsx',
  );

  assert.ok(tree.includes("const VIEW_KEY = 'bpmn-tool:explorer-view'"));
  assert.ok(tree.includes('const readView = (): ExplorerView'));
  assert.ok(tree.includes('window.localStorage.setItem(VIEW_KEY, view)'));
  assert.ok(
    tree.includes(
      'const isSelected = (node.targetId ?? node.id) === selectedId',
    ),
  );
  assert.ok(tree.includes('selectedTreeNodeId'));
});

test('viewer serializes imports and avoids loading-cover flashes during navigation', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );
  const component = await read(
    'src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx',
  );
  const css = await read(
    'src/Components/BusinessComponents/Modeler/Modeler.css',
  );

  assert.ok(hook.includes('importGenerationRef'));
  assert.ok(hook.includes('importQueueRef.current'));
  assert.ok(hook.includes('const clearViewerAfterQueuedImports = () =>'));
  assert.ok(hook.includes('importQueueRef.current = clearTask'));
  assert.ok(component.includes('process-viewer-loading'));
  assert.ok(
    hook.includes(
      'isLoading: (isXmlLoading || isImporting) && !importedRef.current',
    ),
  );
  assert.match(
    css,
    /\.process-viewer-loading\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s,
  );
});

test('folder labels navigate to their page, chevrons expand branches and recent items are limited to processes', async () => {
  const tree = await read(
    'src/Components/BusinessComponents/FolderTree/FolderTree.tsx',
  );
  const hook = await read(
    'src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts',
  );

  assert.match(
    tree,
    /const handleTreeSelection = \(items: \(string \| number\)\[\]\) =>/,
  );
  assert.ok(
    tree.includes(
      'Selecting a folder opens its page; the dedicated chevron controls expansion.',
    ),
  );
  assert.match(tree, /const targetId = node\.targetId \?\? selected;/);
  assert.match(tree, /if \(targetId === selectedId\) return;/);
  assert.match(tree, /onNodeClick\(targetId\)/);
  assert.match(
    tree,
    /onClick=\{event => \{[\s\S]*?toggleNodeExpansion\(nodeId\)/,
  );
  assert.match(
    tree,
    /view !== 'recent' \|\| node\.type === 'process' \|\| node\.type === 'linked-process'/,
  );
  assert.match(
    tree,
    /const processId = selectedNode\.targetId \?\? selectedNode\.id/,
  );
  assert.match(hook, /bpmn-tool:explorer-expanded-nodes/);
  assert.match(
    hook,
    /localStorage\.setItem\(EXPANDED_NODES_KEY, JSON\.stringify\(expandedNodes\)\)/,
  );
  assert.ok(hook.includes('const findPath = (node: RenderTree'));
  assert.ok(hook.includes('node.targetId === selectedResourceId'));
  assert.ok(hook.includes('const treeAncestors = selectedPath'));
});

test('explorer search chevrons collapse and reopen branches using the visible expansion state', async () => {
  const tree = await read(
    'src/Components/BusinessComponents/FolderTree/FolderTree.tsx',
  );

  assert.ok(
    tree.includes(
      'const [searchCollapsedNodes, setSearchCollapsedNodes] = useState<string[]>([])',
    ),
  );
  assert.ok(tree.includes('const effectiveExpandedNodes = useMemo('));
  assert.ok(
    tree.includes(
      'searchExpandedNodes.filter(nodeId => !searchCollapsedNodes.includes(nodeId))',
    ),
  );
  assert.ok(tree.includes('expandedItems: effectiveExpandedNodes'));
  assert.ok(tree.includes('title={effectiveExpandedNodes.includes(nodeId)'));
  assert.ok(
    tree.includes('aria-label={effectiveExpandedNodes.includes(nodeId)'),
  );
  assert.ok(tree.includes('const toggleNodeExpansion = (nodeId: string) =>'));
  assert.ok(
    tree.includes(
      'setSearchCollapsedNodes(current => current.includes(nodeId)',
    ),
  );
  assert.ok(tree.includes('setSearchCollapsedNodes([])'));
});

test('global BPMN search excludes connecting arrows and their documentation', async () => {
  const navigation = await read(
    'src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx',
  );

  assert.match(navigation, /const BPMN_CONNECTION_TYPES = new Set/);
  assert.match(
    navigation,
    /BPMN_CONNECTION_TYPES\.has\(element\.localName\.toLocaleLowerCase\('fr'\)\)/,
  );
  assert.match(
    navigation,
    /BPMN_CONNECTION_TYPES\.has\(bpmnOwner\.localName\.toLocaleLowerCase\('fr'\)\)/,
  );
});

test('quick search removes the IA Comm option and excludes technical BPMN identifiers', async () => {
  const navigation = await read(
    'src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx',
  );

  assert.doesNotMatch(navigation, /<Option value="iaComm">/);
  assert.doesNotMatch(navigation, /'iaComm'/);
  assert.match(
    navigation,
    /return id && \(matchesTerm\(name, term\) \|\|[\s\S]*?matchesTerm\(documentation, term\)/,
  );
  assert.doesNotMatch(navigation, /matchesTerm\(id, term\)/);
  assert.doesNotMatch(navigation, /matchesTerm\(activity\.elementId, term\)/);
  assert.match(navigation, /if \(scope === 'all'\) \{/);
});

test('shared result highlighting marks the matched word for approximate searches', async () => {
  const shared = await read(
    'src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx',
  );

  assert.match(shared, /const editDistance =/);
  assert.match(shared, /queryWord\.length >= 5/);
  assert.match(shared, /const distance = editDistance\(candidate, queryWord\)/);
  assert.match(shared, /bgcolor: '#fff1a8'/);
});

test('global and full search use the same shared result row component', async () => {
  const navigation = await read(
    'src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx',
  );
  const fullSearch = await read(
    'src/Containers/SearchResults/SearchResults.container.tsx',
  );
  const shared = await read(
    'src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx',
  );

  assert.ok(
    navigation.includes(
      "import { SearchResultItem } from '../SearchResultItem/SearchResultItem'",
    ),
  );
  assert.ok(
    fullSearch.includes(
      "import { SearchResultItem } from '../../Components/GenericComponents/SearchResultItem/SearchResultItem'",
    ),
  );
  assert.ok(navigation.includes('<SearchResultItem'));
  assert.ok(fullSearch.includes('<SearchResultItem'));
  assert.ok(shared.includes('badge={badge}') === false);
  assert.ok(shared.includes('highlightNode(title, query)'));
  assert.ok(shared.includes('processName && processName !== title'));
  assert.ok(shared.includes('{similarity} %'));
  assert.ok(shared.includes("bgcolor: '#fff1a8'"));
  assert.ok(navigation.includes('query={search}'));
  assert.ok(fullSearch.includes('query={query}'));
  assert.ok(shared.includes('level="body-xs"'));
});

test('global annotation search labels text annotations as Description and carries the BPMN element ID', async () => {
  const navigation = await read(
    'src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx',
  );

  assert.match(
    navigation,
    /if \(\/annotation BPMN\|Description\/i\.test\(detail\)\)[\s\S]*?label: 'Description'/,
  );
  assert.match(navigation, /const isTextAnnotation = tag === 'textannotation'/);
  assert.match(navigation, /let bpmnOwner: Element \| null = element/);
  assert.match(navigation, /bpmnOwner\.namespaceURI !== BPMN_MODEL_NS/);
  assert.match(
    navigation,
    /const elementId = bpmnOwner\?\.getAttribute\('id'\) \|\| undefined/,
  );
  assert.match(
    navigation,
    /const tag = element\.localName\.toLocaleLowerCase\('fr'\)/,
  );
  assert.match(navigation, /isTextAnnotation = tag === 'textannotation'/);
  assert.match(navigation, /isTextAnnotation \|\| tag === 'documentation'/);
  assert.match(navigation, /resourceId: process\.id,[\s\S]*?elementId,/);
  assert.match(
    navigation,
    /if \(result\.elementId\) params\.set\('elementId', result\.elementId\)/,
  );
});

test('authorized roles can edit the central element sheet in the Viewer shell', async () => {
  const details = await read(
    'src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx',
  );
  assert.ok(details.includes('const isCommonProcess = Boolean('));
  assert.ok(details.includes("usage === 'common'"));
  assert.ok(
    details.includes(
      'const canEditDescription = Boolean(resourceShares) && !isHistoricalView && !isCommonProcess',
    ),
  );
  assert.ok(details.includes('canEditDescription && !isEditingDescription'));
});

test('BPMN label clicks select their owning diagram element', async () => {
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );
  assert.ok(
    hook.includes(
      'const element = clickedElement?.labelTarget ?? clickedElement',
    ),
  );
  assert.ok(hook.includes('follows the object the user actually clicked'));
});

test('selection outline follows BPMN geometry and excludes separate labels', async () => {
  const css = await read(
    'src/Components/BusinessComponents/Modeler/Modeler.css',
  );
  assert.ok(
    css.includes(
      '.djs-element.selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)',
    ),
  );
  assert.ok(
    css.includes(
      '.djs-element.task-selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)',
    ),
  );
  assert.ok(css.includes('stroke: #1976d2 !important'));
  assert.ok(css.includes('stroke-width: 4px !important'));
  assert.ok(!css.includes('.djs-element.selected .djs-outline'));
});

test('administrator explorer context menu restores folder and resource actions', async () => {
  const tree = await read(
    'src/Components/BusinessComponents/FolderTree/FolderTree.tsx',
  );
  assert.ok(tree.includes("const isAdmin = sessionRole === 'admin';"));
  assert.ok(tree.includes('Créer un répertoire'));
  assert.ok(tree.includes('type=folder'));
  assert.ok(tree.includes('Créer un processus'));
  assert.ok(tree.includes('type=process'));
  assert.ok(tree.includes('Partager'));
  assert.ok(tree.includes('Supprimer'));
});

test('Viewer entry points share URL state for BPMN selection, content versions and RACI deep links', async () => {
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');
  const selectionState = await read(
    'src/shared/hooks/useViewerSelectionState.ts',
  );
  const layout = await read(
    'src/Containers/BpmnLayout/BpmnLayout.container.tsx',
  );
  const legacyViewer = await read(
    'src/Containers/ContentViewer/ContentViewer.container.tsx',
  );
  const details = await read(
    'src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx',
  );

  assert.ok(routeState.includes("searchParams.get('elementId')"));
  assert.ok(routeState.includes("searchParams.get('contentId')"));
  assert.ok(routeState.includes("searchParams.get('raci') === '1'"));
  assert.ok(selectionState.includes('useEffect(() =>'));
  assert.ok(
    selectionState.includes('setSelectedElementId(requestedElementId)'),
  );
  assert.ok(
    selectionState.includes('[resourceId, contentId, requestedElementId]'),
  );
  assert.ok(layout.includes('useViewerRouteState()'));
  assert.ok(layout.includes('useViewerSelectionState('));
  assert.ok(layout.includes('requestedRaciView={requestedRaciView}'));
  assert.ok(legacyViewer.includes('useViewerRouteState()'));
  assert.ok(legacyViewer.includes('useViewerSelectionState('));
  assert.doesNotMatch(layout, /useSearchParams|searchParams\.get\(/);
  assert.doesNotMatch(legacyViewer, /useSearchParams|searchParams\.get\(/);
  assert.match(details, /requestedRaciView\?: boolean/);
  assert.match(
    details,
    /if \(requestedRaciView\) setActiveViewerTab\(3\);[\s\S]*?\[requestedRaciView\]/,
  );
  assert.ok(details.includes('keep the'));
  assert.ok(
    !details.includes('[resourceId, selectedContentId, requestedRaciView]'),
  );
  assert.ok(details.includes('<Tab value={3}>RACI</Tab>'));
});

test('Viewer creates a dedicated BpmnViewer without constructing a BpmnModeler', async () => {
  const viewerFactory = await read('src/shared/hooks/useBpmnViewerInstance.ts');
  const modelerFactory = await read('src/shared/hooks/useModelerInstance.ts');
  const viewerHook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );

  assert.ok(
    viewerHook.includes(
      "import { useBpmnViewerInstance } from '../../../../shared/hooks/useBpmnViewerInstance'",
    ),
  );
  assert.ok(
    viewerHook.includes(
      'const { getViewerInstance } = useBpmnViewerInstance()',
    ),
  );
  assert.ok(
    viewerFactory.includes(
      "from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer'",
    ),
  );
  assert.ok(viewerFactory.includes('new BpmnViewer('));
  assert.ok(viewerFactory.includes('VerticalInteractionHitFix'));
  assert.doesNotMatch(viewerFactory, /BpmnModeler|camunda-platform\/Modeler/);
  assert.ok(modelerFactory.includes('new BpmnModeler('));
  assert.doesNotMatch(
    modelerFactory,
    /BpmnViewer|NavigatedViewer|getViewerInstance/,
  );
});

test('Viewer reuses one parsed BPMN document through a dedicated RACI analysis hook', async () => {
  const raci = await read('src/extensions/raci-viewer.ts');
  const analysisHook = await read(
    'src/Containers/ContentViewer/hooks/useViewerRaciAnalysis.ts',
  );
  const viewer = await read(
    'src/Containers/ContentViewer/ContentViewer.container.tsx',
  );

  assert.ok(
    raci.includes(
      'export const deriveRaciMatrixFromDocument = (document: Document): RaciMatrix',
    ),
  );
  assert.ok(
    raci.includes(
      'deriveRaciMatrixFromXml = (xmlContent: string): RaciMatrix =>',
    ),
  );
  assert.ok(raci.includes('deriveRaciMatrixFromDocument('));
  assert.ok(analysisHook.includes('deriveRaciMatrixFromDocument(document)'));
  assert.equal(
    (
      analysisHook.match(/new DOMParser\(\)\.parseFromString\(xmlContent/g) ??
      []
    ).length,
    1,
  );
  assert.ok(analysisHook.includes('laneRoleByElement'));
  assert.ok(analysisHook.includes('laneIdByRole'));
  assert.ok(viewer.includes('useViewerRaciAnalysis(xmlContent)'));
});

test('Viewer delegates RACI issue analysis and filtering to a dedicated hook', async () => {
  const viewer = await read(
    'src/Containers/ContentViewer/ContentViewer.container.tsx',
  );
  const filters = await read(
    'src/Containers/ContentViewer/hooks/useViewerRaciFilters.ts',
  );

  assert.ok(viewer.includes('useViewerRaciFilters(raciMatrix'));
  assert.ok(viewer.includes('filteredActivities'));
  assert.ok(filters.includes('analyzeRaciMatrix(raciMatrix)'));
  assert.ok(filters.includes('filters.issuesOnly') === false);
  assert.ok(filters.includes('actorFilter, codeFilter, issuesOnly'));
});

test('search rows show process context, percentage similarity and group BPMN name with description', async () => {
  const shared = await read(
    'src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx',
  );
  const quick = await read(
    'src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx',
  );
  const full = await read(
    'src/Containers/SearchResults/SearchResults.container.tsx',
  );
  const backend = await read(
    '../backend/src/modules/SearchContext/unified-search.service.ts',
  );

  assert.ok(shared.includes('processName && processName !== title'));
  assert.ok(shared.includes('{similarity} %'));
  assert.ok(quick.includes('processName={result.processName}'));
  assert.ok(quick.includes('similarity={result.similarity}'));
  assert.ok(quick.includes('matchesTerm(documentation, term)'));
  assert.ok(quick.includes('namedElements.includes(bpmnOwner)'));
  assert.ok(full.includes('processName={result.processName}'));
  assert.ok(full.includes('similarity={result.matchScore}'));
  assert.ok(backend.includes('getSearchSimilarity'));
  assert.ok(backend.includes('matchScore'));
});

test('global and full search share yellow highlighting and direct BPMN element navigation', async () => {
  const shared = await read(
    'src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx',
  );
  const quickSearch = await read(
    'src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx',
  );
  const fullSearch = await read(
    'src/Containers/SearchResults/SearchResults.container.tsx',
  );
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');

  assert.match(shared, /bgcolor: '#fff1a8'/);
  assert.match(shared, /const wordPattern = \/\[a-z0-9\]\+\/g/);
  assert.match(shared, /searchable\.replace\(wordPattern, \(token, index\) =>/);
  assert.match(shared, /valueWords\.push\(\{ token, index \}\)/);
  assert.match(shared, /normalize\(character\)/);
  assert.match(quickSearch, /query=\{search\}/);
  assert.match(fullSearch, /query=\{query\}/);
  assert.match(
    fullSearch,
    /if \(result\.elementId\) params\.set\('elementId', result\.elementId\)/,
  );
  assert.match(
    routeState,
    /requestedElementId: searchParams\.get\('elementId'\)/,
  );
});

test('Viewer remarks are stored outside BPMN XML and displayed only while pending', async () => {
  const viewer = await read(
    'src/Containers/ContentViewer/ContentViewer.container.tsx',
  );
  const hook = await read(
    'src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts',
  );
  const entity = await read(
    '../backend/src/modules/ProjectContext/infrastructure/entities/processChangeProposalComment.ormEntity.ts',
  );

  assert.ok(viewer.includes('change-proposals/active?contentId='));
  assert.ok(viewer.includes('elementId: selectedActivityId'));
  assert.ok(viewer.includes('comment: remarkText.trim()'));
  assert.ok(viewer.includes('Remarques ('));
  assert.ok(hook.includes("overlays.add(elementId, 'contextual-remarks'"));
  assert.ok(hook.includes(".filter(remark => remark.status === 'pending')"));
  assert.ok(entity.includes("@Entity('process_change_proposal_comments')"));
  assert.ok(entity.includes('status: ProcessChangeProposalCommentStatus'));
});

test('proposal reviewers can handle remarks in the existing modeler and publication requires a final summary', async () => {
  const modeler = await read(
    'src/Containers/ContentModeler/ContentModeler.container.tsx',
  );
  const controller = await read(
    '../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts',
  );

  assert.ok(modeler.includes('/comments/${remark.id}/decision'));
  assert.ok(modeler.includes("decideRemark(remark, 'accepted')"));
  assert.ok(modeler.includes("decideRemark(remark, 'rejected')"));
  assert.ok(modeler.includes('/comments`'));
  assert.ok(
    modeler.includes('summaryComment: publicationSummaryComment.trim()'),
  );
  assert.ok(controller.includes('ProcessChangeProposalCommentStatus.Pending'));
  assert.ok(controller.includes('L’approbation est bloquée'));
  assert.ok(controller.includes('La publication est bloquée'));
  assert.ok(
    controller.includes(
      'Un commentaire général de validation est obligatoire pour publier',
    ),
  );
});

test('remark decisions reuse the existing validator, project-admin and global-admin permissions', async () => {
  const controller = await read(
    '../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts',
  );

  assert.ok(controller.includes('canReviewAsProjectAdmin'));
  assert.ok(controller.includes('canReviewAsAssignedValidator'));
  assert.ok(
    controller.includes('this.access.hasOrganizationAdminRole(headers)'),
  );
  assert.ok(controller.includes('ProjectMemberRole.Admin'));
  assert.ok(controller.includes('ProjectMemberRole.Modeler'));
  assert.ok(
    controller.includes(
      'L’auteur de la dernière soumission ne peut pas approuver ou refuser sa propre demande',
    ),
  );
  assert.ok(
    controller.includes('L’auteur ne peut pas décider de sa propre remarque'),
  );
});

test('contextual remark migration is included in every existing Coolify and CI migration path', async () => {
  const dockerfile = await read('../deploy/coolify/Dockerfile.migrations');
  const compose = await read('../deploy/coolify/compose.yaml');
  const workflow = await read('../.github/workflows/validate.yml');

  assert.ok(
    dockerfile.includes('20261104_v3_process_change_proposal_comments.sql'),
  );
  assert.ok(
    compose.includes('20261104_v3_process_change_proposal_comments.sql'),
  );
  assert.ok(
    workflow.includes('20261104_v3_process_change_proposal_comments.sql'),
  );
  assert.ok(
    dockerfile.includes(
      '20261104_v3_process_change_proposal_remark_events.sql',
    ),
  );
  assert.ok(
    compose.includes('20261104_v3_process_change_proposal_remark_events.sql'),
  );
  assert.ok(
    workflow.includes('20261104_v3_process_change_proposal_remark_events.sql'),
  );
  assert.ok(workflow.includes("'process_change_proposal_comments'"));
});

test('review queue opens the existing modeler and exposes pending remark counts', async () => {
  const queue = await read(
    'src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx',
  );
  const modeler = await read(
    'src/Containers/ContentModeler/ContentModeler.container.tsx',
  );
  const actionBar = await read(
    'src/Containers/ContentModeler/components/ModelerActionBar.tsx',
  );

  assert.ok(queue.includes('pendingRemarksCount'));
  assert.ok(queue.includes('Traiter dans le modeleur'));
  assert.ok(queue.includes('&reviewRemarks=1'));
  assert.ok(
    modeler.includes('reviewOnly={reviewRemarksMode && !approvedProposalMode}'),
  );
  assert.ok(
    modeler.includes(
      'Mode revue : le diagramme soumis est consulté sans modification',
    ),
  );
  assert.ok(actionBar.includes('!reviewOnly && <>'));
  assert.ok(actionBar.includes('Retour aux demandes'));
});

test('a project modeler can take over corrections for a Viewer-originated proposal', async () => {
  const controller = await read(
    '../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts',
  );
  const start = controller.indexOf('async submitProposal(');
  const end = controller.indexOf(
    "@Post('process-change-proposals/:proposalId/decision')",
    start,
  );
  const submitMethod = controller.slice(start, end);

  assert.ok(submitMethod.includes('ProjectMemberRole.Modeler'));
  assert.ok(submitMethod.includes('ProjectMemberRole.Admin'));
  assert.ok(submitMethod.includes('isOrganizationAdmin'));
  assert.ok(!submitMethod.includes('proposal.authorUserId !== actorUserId'));
  assert.ok(controller.includes('const lastSubmitterUserId'));
});

test('project members need an explicit project permission to submit contextual remarks', async () => {
  const member = await read(
    '../backend/src/modules/ProjectContext/infrastructure/entities/projectMember.ormEntity.ts',
  );
  const projectController = await read(
    '../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts',
  );
  const proposalController = await read(
    '../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts',
  );
  const projectUi = await read(
    'src/Containers/Projects/Projects.container.tsx',
  );
  const migration = await read(
    '../backend/migrations/20261105_v3_project_member_remark_permission.sql',
  );
  assert.ok(member.includes('canSubmitRemarks: boolean'));
  assert.ok(
    projectController.includes('canSubmitRemarks:') &&
      projectController.includes('membershipByProject.get(project.id)?.canSubmitRemarks'),
  );
  assert.ok(proposalController.includes('assertCanSubmitRemarks'));
  assert.ok(projectUi.includes('Peut déposer des remarques'));
  assert.ok(contentViewer.includes('canSubmitViewerRemark'));
  assert.ok(proposalController.includes('!authorMembership.canSubmitRemarks'));
  assert.ok(proposalController.includes('!currentMembership.canSubmitRemarks'));
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS "canSubmitRemarks"'));
});
