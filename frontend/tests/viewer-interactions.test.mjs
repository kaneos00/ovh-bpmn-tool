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
  assert.match(hook, /setIsImporting\(true\);[\s\S]*?setMinimapVisibility\(false\);/);
  assert.match(component, /onClick=\{\(\) => setMinimapVisible\(!minimapVisible\)\}/);
  assert.ok(hook.includes("minimap?.open?.()"));
  assert.ok(hook.includes("minimap?.close?.()"));
  assert.match(component, /aria-label=\{minimapVisible \? 'Masquer la mini-carte' : 'Afficher la mini-carte'\}/);
});

test('element selection toggles immediately on every click while double-click navigation remains separate', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.ok(hook.includes("eventBus.on('element.click', 1500, onElementClick)"));
  assert.ok(hook.includes("eventBus.on('element.dblclick', onElementDoubleClick)"));
  assert.ok(hook.includes("if (selectedIdRef.current === element.id)"));
  assert.ok(hook.includes("onElementSelectRef.current?.('')"));
  assert.ok(hook.includes("onElementSelectRef.current?.(element.id)"));
  assert.match(hook, /if \(!isSelectableElement\) return;[\s\S]*?event\?\.stopPropagation\?\.\(\);[\s\S]*?if \(selectedIdRef\.current === element\.id\)/);
  assert.ok(hook.includes('lower-priority default click selector'));
  assert.ok(hook.includes('Every click toggles the same element immediately'));
  assert.doesNotMatch(hook, /pendingSelectionTimer|lastClickAt|cancelPendingSelection/);
  assert.ok(hook.includes("eventBus.off('element.click', onElementClick)"));
  assert.ok(hook.includes("eventBus.off('element.dblclick', onElementDoubleClick)"));
});

test('viewer selection recognizes collapsed SubProcesses through their BPMN business-object type', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /const elementType = element\.businessObject\?\.\$type \?\? element\.type/);
  assert.match(hook, /eventBus\.on\('element\.click', 1500, onElementClick\)/);
  assert.match(hook, /elementType\.startsWith\('bpmn:'\)/);
  assert.match(hook, /const element = clickedElement\?\.labelTarget \?\? clickedElement/);
  assert.match(hook, /!Array\.isArray\(element\.waypoints\)/);
  assert.match(hook, /onElementSelectRef\.current\?\.\(element\.id\)/);
});

test('BPMN connecting arrows are not selectable in the Viewer', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /const isConnection = Array\.isArray\(element\.waypoints\)/);
  assert.match(hook, /sequenceFlow\|messageFlow\|association\|dataInputAssociation\|dataOutputAssociation/);
  assert.match(hook, /if \(isConnection\) \{[\s\S]*?event\?\.stopPropagation\?\.\(\);[\s\S]*?selection\?\.deselect\?\.\(\[element\]\);[\s\S]*?return;/);
});

test('selection marker is removed before the next selection is applied', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /if \(previousId\) \{\s*canvas\.removeMarker\(previousId, 'task-selected'\);/);
  assert.match(hook, /canvas\.addMarker\(targetId, 'task-selected'\)/);
  assert.match(hook, /useEffect\(\(\) => \{\s*applySelectionRef\.current\(\);\s*\}, \[selectedElementId\]\)/);
});

test('Viewer opens at 1:1 with the BPMN upper-left corner aligned to the viewport', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.match(hook, /canvas\\.zoom\\(1, \\{ x: 0, y: 0 \\}\\)/);
  assert.match(hook, /canvas\\.scroll\\(\\{[\\s\\S]*?dx: \\(currentViewbox\\.x - bounds\\.x\\)/);
  assert.match(hook, /canvas\\.viewbox\\(\\{\\s*x: bounds\\.x,\\s*y: bounds\\.y,\\s*width,\\s*height,\\s*\\}\\)/);
  assert.match(hook, /initialViewportAppliedRef\.current = restoredViewport \|\| showDiagramAtActualSize\(\);[\s\S]*?applySelectionRef\.current\(\);/);
  assert.match(hook, /new ResizeObserver\([\s\S]*?initialViewportAppliedRef\.current = showDiagramAtActualSizeRef\.current\(\)/);
  assert.match(hook, /const resetZoom = \(\) => \{[\s\S]*?showDiagramAtActualSizeRef\.current\(\)/);
  assert.match(hook, /const fitDiagram = \(\) => \{[\s\S]*?fitModeRef\.current = true;[\s\S]*?canvas\.zoom\('fit-viewport'\)/);
  assert.match(hook, /const resizeDiagram = \(\) => \{[\s\S]*?if \(fitModeRef\.current\) \{[\s\S]*?canvas\.zoom\('fit-viewport'\)/);
  assert.match(hook, /canvas\.viewbox\(viewbox\)/);
  assert.match(hook, /canvas\.viewbox\.changed/);
  assert.match(component, /onClick=\{fitDiagram\}/);
  assert.match(component, /aria-label="Ajuster à la fenêtre"/);
});

test('Viewer retries its initial BPMN viewport when a hidden tab becomes visible', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /initialViewportAppliedRef = useRef\(false\)/);
  assert.match(hook, /new ResizeObserver\(entries =>/);
  assert.match(hook, /entry\.contentRect\.width <= 0 \|\| entry\.contentRect\.height <= 0/);
  assert.match(hook, /observer\.observe\(host\)/);
  assert.match(hook, /observer\.disconnect\(\)/);
  assert.match(hook, /initialViewportAppliedRef\.current = false/);
});

test('Viewer previews nested SubProcess elements on hover and removes the preview on pointer exit', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.match(hook, /eventBus\.on\('element\.hover', onElementHover\)/);
  assert.match(hook, /eventBus\.on\('element\.out', onElementOut\)/);
  assert.match(hook, /element\.businessObject\?\.flowElements/);
  assert.match(hook, /overlays\.add\(element, 'subprocess-preview'/);
  assert.match(hook, /eventBus\.off\('element\.hover', onElementHover\)/);
  assert.match(hook, /eventBus\.off\('element\.out', onElementOut\)/);
  assert.match(css, /\.bpmn-subprocess-preview\s*\{/);
  assert.match(css, /\.bpmn-subprocess-preview__list\s*\{/);
});

test('viewer delegates called-process navigation to the shared hook', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /import \{ useCallActivityNavigation \} from '[^']*useCallActivityNavigation'/);
  assert.match(hook, /useCallActivityNavigation\(viewer, true\)/);
});

test('detail panel starts collapsed and follows the selected BPMN element', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /const \[taskPanelCollapsed, setTaskPanelCollapsed\] = useState\(true\)/);
  assert.match(details, /setTaskPanelCollapsed\(!selectedElementId\)/);
  assert.match(details, /second click on the same BPMN element/);
  assert.match(details, /externalUrl:\s*Array\.from\(element\.attributes\)[\s\S]*?attribute\.localName === 'link'/);
});

test('shared explorer delegates node selection to the selected-resource navigation callback', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const shared = await read('src/Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel.tsx');

  assert.ok(details.includes('onNodeClick={id => navigate(`/${id}`)}'));
  assert.ok(shared.includes('<FolderTree selectedId={selectedId} onNodeClick={onNodeClick} />'));
});

test('linked Call Activity opens its target only on double-click and handles missing targets', async () => {
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');

  assert.match(navigation, /eventBus\.on\('element\.dblclick', 1500, navigateToLinkedProcess\)/);
  assert.ok(navigation.includes('const getExternalTaskUrl = (element: any): string =>'));
  assert.ok(navigation.includes('const url = getExternalTaskUrl(event.element)'));
  assert.ok(navigation.includes('openExternalUrl(url)'));
  assert.ok(!navigation.includes('handleCollapsedSubProcessClickFallback'),
    'SubProcess navigation must not intercept element.click and suppress simple-click selection');
  assert.ok(!navigation.includes("eventBus.on('element.click', 1500"),
    'the shared navigation hook must leave single-click events to the Viewer selection handler');
  assert.match(navigation, /type === 'bpmn:CallActivity'/);
  assert.match(navigation, /type !== 'bpmn:SubProcess'/);
  assert.match(navigation, /type !== 'bpmn:Transaction'/);
  assert.match(navigation, /resolveProcessTarget\(targetId, processInfo\)/);
  assert.ok(navigation.includes('const query = explorerQuery()'));
  assert.ok(navigation.includes('queryClient.fetchQuery(\n            query.queryKey,\n            query.queryFn,\n            { staleTime: 30_000 },\n          )'));
  assert.ok(navigation.includes('explorer.links.map(link => [link.resourceId, link])'));
  assert.match(navigation, /apiClient\.get\('\/projects\/me\/workspace'\)/);
  assert.match(navigation, /resourcesById\.set\(process\.resourceId/);
  assert.ok(navigation.includes('processIds: linksByResourceId.get(resource.id)?.processIds ?? []'));
  assert.ok(!navigation.includes('getXmlContentQuery'));
  assert.ok(!navigation.includes('contentsQuery'));
  assert.ok(!navigation.includes('resourcesQuery'));
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
  assert.match(tree, /onExpandItem=\{item => \{[\s\S]*?if \(isSearching\) setSearchCollapsedNodes/);
  assert.match(tree, /onCollapseItem=\{item => \{[\s\S]*?if \(isSearching\) setSearchCollapsedNodes/);
});



test('external link indicator is limited to the selected linked Call Activity', async () => {
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');

  assert.ok(navigation.includes("eventBus.on('selection.changed', 1000, showIndicatorForSelectedLinkedElement)"));
  assert.ok(navigation.includes('if (indicatorOverlayId !== undefined)'));
  assert.ok(navigation.includes("bpmnInstance.get('overlays')?.remove?.(indicatorOverlayId)"));
  assert.ok(navigation.includes("indicator.className = 'bjs-drilldown url-link-overlay bpmn-call-activity-link-indicator'"));
  assert.ok(navigation.includes("position: { bottom: -7, right: -8 }"));
  assert.ok(navigation.includes("indicator.addEventListener('click'"));
  assert.ok(navigation.includes("eventBus.off('selection.changed', showIndicatorForSelectedLinkedElement)"));
});

test('external task URL is rendered as a safe external link in the documentation section', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes('!isEditingDescription && selectedTask.externalUrl && ('));
  assert.ok(details.includes('href={selectedTask.externalUrl.startsWith'));
  assert.ok(details.includes('target="_blank"'));
  assert.ok(details.includes('rel="noopener noreferrer"'));
});


test('minimap internal open/close control is hidden while the toolbar toggle remains available', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.match(css, /\.djs-minimap \.toggle\s*\{[^}]*display:\s*none\s*!important;/s);
  assert.ok(component.includes('Mini-carte'));
  assert.ok(component.includes('onClick={() => setMinimapVisible(!minimapVisible)}'));
});

test('data references are selectable and task URLs open on double-click', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.ok(hook.includes("element?.type === 'bpmn:DataStoreReference'"));
  assert.ok(hook.includes("element?.type === 'bpmn:DataObjectReference'"));
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
  assert.match(css, /\.bjs-drilldown:not\(\.url-link-overlay\)[\s\S]*?display:\s*none\s*!important;/s);
  assert.match(css, /\.bpmn-call-activity-link-indicator\s*\{[^}]*pointer-events:\s*auto/s);
});

test('explorer remembers the selected tab and highlights linked-process resources by target ID', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(tree.includes("const VIEW_KEY = 'bpmn-tool:explorer-view'"));
  assert.ok(tree.includes('const readView = (): ExplorerView'));
  assert.ok(tree.includes('window.localStorage.setItem(VIEW_KEY, view)'));
  assert.ok(tree.includes('const isSelected = resourceId === selectedId'));
  assert.ok(tree.includes('selectedTreeNodeId'));
});

test('viewer serializes imports and avoids loading-cover flashes during navigation', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.ok(hook.includes('importGenerationRef'));
  assert.ok(hook.includes('importQueueRef.current'));
  assert.ok(hook.includes('const clearViewerAfterQueuedImports = () =>'));
  assert.ok(hook.includes('importQueueRef.current = clearTask'));
  assert.ok(component.includes('process-viewer-loading'));
  assert.ok(hook.includes('isLoading: (isXmlLoading || isImporting) && !importedRef.current'));
  assert.match(css, /\.process-viewer-loading\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
});


test('folder labels navigate to their page, chevrons expand branches and recent items are limited to processes', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');

  assert.match(tree, /const handleTreeSelection = \(items: \(string \| number\)\[\]\) =>/);
  assert.ok(tree.includes('Selecting a folder opens its page; the dedicated chevron controls expansion.'));
  assert.match(tree, /const targetId = node\.targetId \?\? selected;/);
  assert.match(tree, /if \(targetId === selectedId\) return;/);
  assert.match(tree, /onNodeClick\(targetId\)/);
  assert.match(tree, /onClick=\{event => \{[\s\S]*?toggleNodeExpansion\(nodeId\)/);
  assert.match(tree, /view !== 'recent' \|\| node\.type === 'process' \|\| node\.type === 'linked-process'/);
  assert.match(tree, /const processId = selectedNode\.targetId \?\? selectedNode\.id/);
  assert.match(hook, /bpmn-tool:explorer-expanded-nodes/);
  assert.match(hook, /localStorage\.setItem\(EXPANDED_NODES_KEY, JSON\.stringify\(expandedNodes\)\)/);
  assert.ok(hook.includes('const findPath = (node: RenderTree'));
  assert.ok(hook.includes('node.targetId === selectedResourceId'));
  assert.ok(hook.includes('const treeAncestors = selectedPath'));
});


test('explorer search chevrons collapse and reopen branches using the visible expansion state', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(tree.includes('const [searchCollapsedNodes, setSearchCollapsedNodes] = useState<string[]>([])'));
  assert.ok(tree.includes('const effectiveExpandedNodes = useMemo('));
  assert.ok(tree.includes('searchExpandedNodes.filter(nodeId => !searchCollapsedNodes.includes(nodeId))'));
  assert.ok(tree.includes('expandedItems: effectiveExpandedNodes'));
  assert.ok(tree.includes('title={effectiveExpandedNodes.includes(nodeId)'));
  assert.ok(tree.includes('aria-label={effectiveExpandedNodes.includes(nodeId)'));
  assert.ok(tree.includes('const toggleNodeExpansion = (nodeId: string) =>'));
  assert.ok(tree.includes('setSearchCollapsedNodes(current => current.includes(nodeId)'));
  assert.ok(tree.includes('setSearchCollapsedNodes([])'));
});

test('unified BPMN search excludes connecting arrows and their documentation', async () => {
  const backend = await read('../backend/src/modules/SearchContext/unified-search.service.ts');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');

  assert.match(navigation, /unifiedSearchQuery/);
  assert.match(backend, /const BPMN_CONNECTION_TYPES = new Set/);
  assert.match(backend, /if \(BPMN_CONNECTION_TYPES\.has\(key\)\) return/);
});

test('quick search delegates to the unified service and does not search technical identifiers', async () => {
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const backend = await read('../backend/src/modules/SearchContext/unified-search.service.ts');

  assert.doesNotMatch(navigation, /iaComm/);
  assert.match(navigation, /unifiedSearchQuery/);
  assert.match(navigation, /types: typeByScope\[scope\]/);
  assert.match(backend, /const searchableFields = \[/);
  assert.match(backend, /\{ value: name, field: 'nome' \}/);
  assert.match(backend, /\{ value: documentation, field: 'descrizione' \}/);
  assert.doesNotMatch(backend, /\{ value: elementId, field:/);
});

test('shared result highlighting marks the matched word for approximate searches', async () => {
  const shared = await read('src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx');

  assert.match(shared, /const editDistance =/);
  assert.match(shared, /queryWord\.length >= 5/);
  assert.match(shared, /const distance = editDistance\(candidate, queryWord\)/);
  assert.match(shared, /bgcolor: '#fff1a8'/);
});

test('global and full search use the same shared result row component', async () => {
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const fullSearch = await read('src/Containers/SearchResults/SearchResults.container.tsx');
  const shared = await read('src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx');

  assert.ok(navigation.includes("import { SearchResultItem } from '../SearchResultItem/SearchResultItem'"));
  assert.ok(fullSearch.includes("import { SearchResultItem } from '../../Components/GenericComponents/SearchResultItem/SearchResultItem'"));
  assert.ok(navigation.includes('<SearchResultItem'));
  assert.ok(fullSearch.includes('<SearchResultItem'));
  assert.ok(shared.includes('badge={badge}') === false);
  assert.ok(shared.includes('highlightNode(title, query)'));
  assert.ok(shared.includes('processName && processName !== title'));
  assert.ok(shared.includes('{similarity} %'));
  assert.ok(shared.includes('bgcolor: \'#fff1a8\''));
  assert.ok(navigation.includes('query={search}'));
  assert.ok(fullSearch.includes('query={query}'));
  assert.ok(shared.includes('level="body-xs"'));
});

test('unified search returns text annotations with their owning BPMN element ID', async () => {
  const backend = await read('../backend/src/modules/SearchContext/unified-search.service.ts');
  const fullSearch = await read('src/Containers/SearchResults/SearchResults.container.tsx');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');

  assert.match(backend, /textAnnotation: 'Annotazione'/);
  assert.match(backend, /const annotationText =\s*key === 'textAnnotation'/);
  assert.match(backend, /\{ value: annotationText, field: 'testo annotazione' \}/);
  assert.match(backend, /elementId,/);
  assert.match(fullSearch, /'testo annotazione': 'Texte de l’annotation'/);
  assert.match(navigation, /if \(result\.elementId\) params\.set\('elementId', result\.elementId\)/);
});

test('authorized roles can edit the central element sheet in the Viewer shell', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  assert.ok(details.includes("const canEditDescription = !isHistoricalView && (sessionRole === 'admin' || sessionRole === 'modeler')"));
  assert.ok(details.includes('canEditDescription && !isEditingDescription'));
});

test('BPMN label clicks select their owning diagram element', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  assert.ok(hook.includes('const element = clickedElement?.labelTarget ?? clickedElement'));
  assert.ok(hook.includes('follows the object the user actually clicked'));
});

test('selection outline follows BPMN geometry and excludes separate labels', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  assert.ok(css.includes('.djs-element.selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)'));
  assert.ok(css.includes('.djs-element.task-selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)'));
  assert.ok(css.includes('stroke: #1976d2 !important'));
  assert.ok(css.includes('stroke-width: 4px !important'));
  assert.ok(!css.includes('.djs-element.selected .djs-outline'));
});

test('administrator explorer context menu restores folder and resource actions', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  assert.ok(tree.includes("const isAdmin = sessionRole === 'admin';"));
  assert.ok(tree.includes('Créer un sous-répertoire'));
  assert.ok(tree.includes('type=folder'));
  assert.ok(tree.includes('Créer un processus'));
  assert.ok(tree.includes('type=process'));
  assert.ok(tree.includes('Partager'));
  assert.ok(tree.includes('Supprimer'));
});


test('legacy content-viewer URLs redirect to the canonical process viewer', async () => {
  const routes = await read('src/routes.tsx');
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');
  const selectionState = await read('src/shared/hooks/useViewerSelectionState.ts');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(routes, /path: '\/:resourceId\/viewer\/:contentId'[\s\S]*?loader:/);
  assert.ok(routes.includes("url.searchParams.set('contentId', params.contentId ?? '')"));
  assert.ok(routes.includes('url.searchParams.toString()'), 'legacy deep-link query parameters are preserved');
  assert.doesNotMatch(routes, /lazy: \(\) => import\('\.\/Containers\/ContentViewer'\)/);

  assert.ok(routeState.includes("searchParams.get('elementId')"));
  assert.ok(routeState.includes("searchParams.get('contentId')"));
  assert.ok(routeState.includes("searchParams.get('raci') === '1'"));
  assert.ok(selectionState.includes('useEffect(() =>'));
  assert.ok(selectionState.includes('setSelectedElementId(requestedElementId)'));
  assert.ok(selectionState.includes('[resourceId, contentId, requestedElementId]'));
  assert.ok(layout.includes('useViewerRouteState()'));
  assert.ok(layout.includes('useViewerSelectionState('));
  assert.ok(layout.includes('selectedContentId={requestedContentId}'));
  assert.ok(layout.includes('requestedRaciView={requestedRaciView}'));
  assert.doesNotMatch(layout, /useSearchParams|searchParams\.get\(/);
  assert.match(details, /selectedContentId\?: string \| null/);
  assert.match(details, /let viewerContent = publishedContent \?\? undefined;/);
  assert.match(details, /if \(selectedContentId\) \{[\s\S]*?viewerContent = contents\.find\(content => content\.id === selectedContentId\)/);
  assert.match(details, /else if \(!viewerContent && isProjectVariant\) \{[\s\S]*?viewerContent = draftContent/);
  assert.match(details, /const isHistoricalView = Boolean\([\s\S]*?viewerContent\.id !== publishedContent\?\.id/);
  assert.match(details, /const canEditDescription = !isHistoricalView/);
  assert.match(details, /const canManageVersions = !isHistoricalView/);
  assert.match(details, /requestedRaciView\?: boolean/);
  assert.match(details, /if \(requestedRaciView\) setActiveViewerTab\(3\);[\s\S]*?\[requestedRaciView\]/);
  assert.ok(details.includes('<Tab value={3}>RACI</Tab>'));
});


test('Viewer creates a dedicated BpmnViewer without constructing a BpmnModeler', async () => {
  const viewerFactory = await read('src/shared/hooks/useBpmnViewerInstance.ts');
  const modelerFactory = await read('src/shared/hooks/useModelerInstance.ts');
  const viewerHook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.ok(viewerHook.includes("import { useBpmnViewerInstance } from '../../../../shared/hooks/useBpmnViewerInstance'"));
  assert.ok(viewerHook.includes('const { getViewerInstance } = useBpmnViewerInstance()'));
  assert.ok(viewerFactory.includes("from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer'"));
  assert.ok(viewerFactory.includes('new BpmnViewer('));
  assert.ok(viewerFactory.includes('VerticalInteractionHitFix'));
  assert.doesNotMatch(viewerFactory, /BpmnModeler|camunda-platform\/Modeler/);
  assert.ok(modelerFactory.includes('new BpmnModeler('));
  assert.doesNotMatch(modelerFactory, /BpmnViewer|NavigatedViewer|getViewerInstance/);
});

test('Viewer reuses one parsed BPMN document through a dedicated RACI analysis hook', async () => {
  const raci = await read('src/extensions/raci-viewer.ts');
  const analysisHook = await read('src/shared/hooks/useViewerRaciAnalysis.ts');

  const canonicalViewer = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(raci.includes('export const deriveRaciMatrixFromDocument = (document: Document): RaciMatrix'));
  assert.ok(raci.includes('deriveRaciMatrixFromXml = (xmlContent: string): RaciMatrix =>'));
  assert.ok(raci.includes('deriveRaciMatrixFromDocument('));
  assert.ok(analysisHook.includes('deriveRaciMatrixFromDocument(document)'));
  assert.equal((analysisHook.match(/new DOMParser\(\)\.parseFromString\(xmlContent/g) ?? []).length, 1);
  assert.ok(analysisHook.includes('laneRoleByElement'));
  assert.ok(analysisHook.includes('laneIdByRole'));
  assert.ok(canonicalViewer.includes('useViewerRaciAnalysis(xmlContent)'));
});

test('Viewer delegates RACI issue analysis and filtering to a dedicated hook', async () => {
  const canonicalViewer = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const filters = await read('src/shared/hooks/useViewerRaciFilters.ts');


  assert.ok(canonicalViewer.includes('useViewerRaciFilters('));
  assert.ok(canonicalViewer.includes('filteredActivities'));
  assert.ok(filters.includes('analyzeRaciMatrix(raciMatrix)'));
  assert.ok(filters.includes('filters.issuesOnly') === false);
  assert.ok(filters.includes('actorFilter, codeFilter, issuesOnly'));
});

test('search rows show process context, percentage similarity and group BPMN name with description', async () => {
  const shared = await read('src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx');
  const quick = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const full = await read('src/Containers/SearchResults/SearchResults.container.tsx');
  const backend = await read('../backend/src/modules/SearchContext/unified-search.service.ts');

  assert.ok(shared.includes('processName && processName !== title'));
  assert.ok(shared.includes('{similarity} %'));
  assert.ok(quick.includes('processName={result.processName}'));
  assert.ok(quick.includes('similarity={result.similarity}'));
  assert.ok(quick.includes('unifiedSearchQuery'));
  assert.ok(quick.includes('similarity: result.matchScore'));
  assert.ok(backend.includes('extractBpmnSearchResults'));
  assert.ok(full.includes('processName={result.processName}'));
  assert.ok(full.includes('similarity={result.matchScore}'));
  assert.ok(backend.includes('getSearchSimilarity'));
  assert.ok(backend.includes('matchScore'));
});

test('global and full search share yellow highlighting and direct BPMN element navigation', async () => {
  const shared = await read('src/Components/GenericComponents/SearchResultItem/SearchResultItem.tsx');
  const quickSearch = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const fullSearch = await read('src/Containers/SearchResults/SearchResults.container.tsx');
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');

  assert.match(shared, /bgcolor: '#fff1a8'/);
  assert.match(shared, /const wordPattern = \/\[a-z0-9\]\+\/g/);
  assert.match(shared, /searchable\.replace\(wordPattern, \(token, index\) =>/);
  assert.match(shared, /valueWords\.push\(\{ token, index \}\)/);
  assert.match(shared, /normalize\(character\)/);
  assert.match(quickSearch, /query=\{search\}/);
  assert.match(fullSearch, /query=\{query\}/);
  assert.match(fullSearch, /if \(result\.elementId\) params\.set\('elementId', result\.elementId\)/);
  assert.match(routeState, /requestedElementId: searchParams\.get\('elementId'\)/);
});


test('explorer actions use an accessible three-dot menu and project roles', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.doesNotMatch(tree, /onContextMenu/);
  assert.match(tree, /folder-tree-actions/);
  assert.match(tree, /<MoreVert fontSize="small" \/>/);
  assert.match(tree, /setContextMenu\(\{ nodeId, anchorEl: event\.currentTarget \}\)/);
  assert.match(tree, /projects\/me\/workspace/);
  assert.match(tree, /projectModelerResourceIds\.includes\(resourceId\)/);
  assert.match(tree, /useEffect\(\(\) => \{ setContextMenu\(null\); \}, \[activeProjectId, selectedId\]\)/);
});

test('the right element-details panel and its resize handle exist only on the BPMN diagram tab', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /activeViewerTab === 0 && viewerContent && !taskPanelCollapsed && \([\s\S]*?aria-label="Redimensionner le panneau de tâche"/);
  assert.match(details, /activeViewerTab === 0 && viewerContent && \([\s\S]*?className=\{\`processTaskPanel/);
  assert.match(details, /<Tab value=\{2\}>Historique des versions<\/Tab>/);
  assert.match(details, /<Tab value=\{3\}>RACI<\/Tab>/);
  assert.match(details, /<Tab value=\{4\}>Informations documentées<\/Tab>/);
});


test('BPMN element selection opens the right-hand panel and a second click closes it', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(details, /setTaskPanelCollapsed\(!selectedElementId\)/);
  assert.match(details, /second click on the same BPMN element/);
  assert.ok(hook.includes("onElementSelectRef.current?.(element.id)"));
  assert.ok(hook.includes("onElementSelectRef.current?.('')"));
  assert.match(hook, /if \(selectedIdRef\.current === element\.id\) \{[\s\S]*?onElementSelectRef\.current\?\.\(''\)/);
  assert.doesNotMatch(hook, /pendingSelectionTimer|isRapidSecondClick/);
  assert.ok(hook.includes("canvas.addMarker(targetId, 'task-selected')"));
  assert.ok(hook.includes("canvas.removeMarker(previousId, 'task-selected')"));
});

test('BPMN viewer exposes native fullscreen controls and browser Escape exit', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.ok(viewer.includes('requestFullscreen()'));
  assert.ok(viewer.includes('document.exitFullscreen()'));
  assert.ok(viewer.includes("document.addEventListener('fullscreenchange'"));
  assert.ok(viewer.includes('Afficher le BPMN en plein écran'));
  assert.ok(viewer.includes('Quitter le plein écran (Échap)'));
  assert.ok(css.includes('.process-viewer-shell:fullscreen'));
});


test('proposal review opens and edits only the exact submitted BPMN snapshot', async () => {
  const queue = await read('src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx');
  const modeler = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const contentHook = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');
  const backend = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts');

  assert.ok(queue.includes('proposal.submittedContentId'));
  assert.ok(queue.includes('reviewRemarks=1'));
  assert.ok(queue.includes('&contentId='));
  assert.match(modeler, /const reviewRemarksMode = searchParams\.get\('reviewRemarks'\) === '1'/);
  assert.match(modeler, /<ProposalRemarksPanel[\s\S]*?proposalId=\{proposalId\}[\s\S]*?canDecide=\{reviewRemarksMode\}/);

  assert.match(contentHook, /getContentQuery\(resourceId, requestedContentId \?\? ''\)/);
  assert.match(contentHook, /enabled: enabled && Boolean\(proposalId && requestedContentId\)/);
  assert.match(contentHook, /if \(listedContent\) return listedContent;[\s\S]*?if \(proposalId\) return requestedContent/);
  assert.match(contentHook, /getXmlContentQuery\(resourceId, selectedContent\?\.id as string\)/);
  assert.match(contentHook, /proposalContentLookupFailed = Boolean\([\s\S]*?proposalId &&[\s\S]*?requestedContentId[\s\S]*?!selectedContent[\s\S]*?requestedContentIsError/);
  assert.match(contentHook, /const editableContent = proposalId && selectedContent\?\.status === ContentStatusEnum\.Draft[\s\S]*?\? selectedContent[\s\S]*?: draftContent/);

  assert.match(backend, /const submittedContent = await contents\.findOne\([\s\S]*?resourceId: proposal\.cloneResourceId,[\s\S]*?status: ContentStatusEnum\.Draft/);
  assert.match(backend, /proposal\.submittedContentId = submittedContent\.id/);
  assert.match(backend, /submittedContentId: submittedContent\.id/);
});
