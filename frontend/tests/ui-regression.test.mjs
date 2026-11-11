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
    assert.ok(viewer.includes(`element?.type === 'bpmn:${type}'`), `missing Viewer branch for ${type}`);
    assert.ok(viewer.includes(`canvas.addMarker(element.id, 'bpmn-gateway-${marker}')`), `missing Viewer marker for ${type}`);
    assert.ok(modelerCss.includes(`.djs-element.bpmn-gateway-${marker} .djs-visual > *`), `missing shared gateway style for ${type}`);
  }

  const sharedGatewayStyle = modelerCss.match(/\/\* All gateways share a dark-purple outline[\s\S]*?\*\/([\s\S]*?)(?=\/\*|$)/);
  assert.ok(sharedGatewayStyle, 'shared gateway style block should exist');
  assert.match(sharedGatewayStyle[1], /stroke:\s*#6a0dad\s*!important;/i);
  assert.doesNotMatch(sharedGatewayStyle[1], /fill\s*:/i, 'gateway outline styling must not replace the gateway fill');
});



test('Parallel Gateway inner plus is violet without changing the diamond fill', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.match(css, /\.djs-element\.bpmn-gateway-parallel \.djs-visual > path\s*\{[^}]*fill:\s*#6a0dad\s*!important;[^}]*stroke:\s*#6a0dad\s*!important;/s);
  assert.match(css, /\.djs-element\.bpmn-gateway-event-based \.djs-visual > \*/);
});

test('cross-process annotation search uses the Viewer selection query parameter', async () => {
  const provider = await read('src/extensions/recherche/recherche-repository-provider.ts');
  const module = await read('src/extensions/recherche/recherche-module.ts');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');
  const selectionState = await read('src/shared/hooks/useViewerSelectionState.ts');

  assert.ok(provider.includes('`/${resource.id}?elementId=${encodeURIComponent(id)}`'));
  assert.ok(module.includes("target.searchParams.set('elementId', result.id)"));
  assert.ok(layout.includes('useViewerRouteState'));
  assert.ok(routeState.includes("searchParams.get('elementId')"));
  assert.ok(layout.includes('useViewerSelectionState('));
  assert.ok(selectionState.includes('setSelectedElementId(requestedElementId)'));
});

test('description search indexes text annotations and selects a live matching BPMN element', async () => {
  const provider = await read('src/extensions/recherche/recherche-repository-provider.ts');
  const module = await read('src/extensions/recherche/recherche-module.ts');

  assert.ok(provider.includes("node.localName !== 'textAnnotation'"));
  assert.ok(provider.includes("child.localName === 'text'"));
  assert.ok(provider.includes('name: node.getAttribute(\'name\') || annotationText(node)'));
  assert.ok(provider.includes('documentation: [documentationText(node), annotationText(node)]'));
  assert.ok(module.includes('const liveElement = result.element ?? ('));
  assert.ok(module.includes('elementRegistry.get(result.id)'));
  assert.ok(module.includes("? 'Description'"));
  assert.ok(module.includes('selection.select(liveElement)'));
});


test('called-process tree resolution is unambiguous, deduplicated and cycle-safe', async () => {
  const links = await read('src/Components/BusinessComponents/FolderTree/processLinks.ts');
  const tree = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');

  assert.ok(links.includes("getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity')"));
  assert.ok(links.includes("element.getAttribute('calledElement')?.trim() || ''"));
  assert.ok(links.includes("getElementsByTagNameNS('*', 'BPMNShape')"));
  assert.ok(links.includes("shape.getAttribute('isExpanded') === 'false'"));
  assert.ok(links.includes("shape.getAttribute('bpmnElement')?.trim() || ''"));
  assert.ok(links.includes('collapsedShapeElementIds.has(id)'));
  assert.ok(links.includes('matches.length === 1 && !byIdentifier.has(processId)'));
  assert.ok(links.includes('const targets = Array.from(new Set(info.targets))'));
  assert.ok(links.includes('target.id !== info.resource.id'));
  assert.ok(links.includes('if (parentByTarget.has(target.id)) return;'));
  assert.ok(links.includes('reaches(linked, target.id, info.resource.id)'));
  assert.ok(links.includes('linked.get(info.resource.id)?.push(target)'));
  assert.ok(tree.includes('linked-process:'));
});

test('explorer folder-label selection opens the folder page while the chevron controls expansion', async () => {
  const explorer = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.ok(explorer.includes('const handleTreeSelection = (items: (string | number)[]) =>'));
  assert.ok(explorer.includes('const targetId = node.targetId ?? selected;'));
  assert.ok(explorer.includes('if (targetId === selectedId) return;'));
  assert.ok(explorer.includes('onNodeClick(targetId)'));
  assert.ok(explorer.includes('Selecting a folder opens its page; the dedicated chevron controls expansion.'));
  assert.ok(!explorer.includes("if (node.type === 'folder')"), 'folder selection must not be intercepted as an expansion-only action');

  const treeHook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
  assert.ok(treeHook.includes('resource.type === ResourceType.Folder'));
  assert.ok(treeHook.includes('getFolderHierarchy(hierarchyResourceId).map(({ id }) => id)'));
});


test('explorer delegates Call Activity and collapsed SubProcess links to the tested resolver', async () => {
  const hook = await read('src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
  const processLinks = await read('src/Components/BusinessComponents/FolderTree/processLinks.ts');

  assert.match(hook, /import \{ resolveLinkedChildren \} from '\.\.\/processLinks'/);
  assert.match(hook, /import \{ explorerQuery \} from '\.\.\/\.\.\/\.\.\/\.\.\/api\/resources\/resources\.queries'/);
  assert.match(hook, /useQuery\(explorerQuery\(\)\)/);
  assert.doesNotMatch(hook, /getProcessLinks|contentsQuery|getXmlContentQuery/);
  assert.match(hook, /return resolveLinkedChildren\(processInfo\)/);
  assert.ok(processLinks.includes("getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity')"));
  assert.ok(processLinks.includes("getElementsByTagNameNS('*', 'BPMNShape')"));
  assert.ok(processLinks.includes("shape.getAttribute('isExpanded') === 'false'"));
  assert.ok(processLinks.includes("shape.getAttribute('bpmnElement')?.trim() || ''"));
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');
  assert.ok(navigation.includes('element?.businessObject?.di?.isExpanded'));
  assert.ok(navigation.includes("return expandedState === false || expandedState === 'false'"));
});

test('viewer uses the shared explorer panel instead of the legacy ResourceExplorer', async () => {
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const routes = await read('src/routes.tsx');

  assert.ok(layout.includes("import { ViewerExplorerPanel } from '../../Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel'"));
  assert.ok(layout.includes('<ViewerExplorerPanel'));
  assert.ok(layout.includes('variant="process-details"'));
  assert.ok(layout.includes('showHistory'));
  assert.ok(layout.includes('folderExplorerCollapsed'));
  assert.ok(!layout.includes('<FolderTree'));
  assert.ok(!layout.includes('ResourceExplorer'));
  assert.ok(details.includes("import { ViewerExplorerPanel } from '../ViewerExplorerPanel/ViewerExplorerPanel'"));
  assert.ok(details.includes('<ViewerExplorerPanel'));
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
  assert.ok(breadcrumbs.includes('useFolderTree(resourceId)'));
  assert.ok(breadcrumbs.includes('const treePath = findPath(dataTree)'));
  assert.ok(breadcrumbs.includes("treePath.filter(node => node.id !== 'root').map(node => ({"));
  assert.ok(breadcrumbs.includes('to: `/${node.targetId ?? node.id}`'));
  assert.ok(breadcrumbs.includes("resource.parentId ?? 'root'"), 'keep a fallback for resources missing from the tree');
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
  const editor = await read('src/Containers/ContentModeler/hooks/useModeler.ts');
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const urlModule = await read('src/extensions/url-click-module.ts');

  assert.match(viewer, /element\?\.type === 'bpmn:StartEvent'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-start-event'\)/);
  assert.match(viewer, /element\?\.type === 'bpmn:EndEvent'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-end-event'\)/);
  assert.match(editor, /element\?\.type === 'bpmn:StartEvent'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-start-event'\)/);
  assert.match(editor, /element\?\.type === 'bpmn:EndEvent'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-end-event'\)/);
  assert.match(editor, /element\?\.type === 'bpmn:DataStoreReference'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-data-store'\)/);
  assert.match(editor, /element\?\.type === 'bpmn:DataObjectReference'[\s\S]*?canvas\.addMarker\(element\.id, 'bpmn-data-object-reference'\)/);
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


test('detail panel starts collapsed, opens on selection and keeps visibility under user control', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /useState\(true\);[\s\S]*?taskPanelCollapsed/);
  assert.match(details, /if \(selectedElementId\) setTaskPanelCollapsed\(false\)/);
  assert.doesNotMatch(details, /setTaskPanelCollapsed\(!selectedElementId\)/);
  assert.match(details, /className="viewerPanelHeader processTaskPanelHeader"[\s\S]*?onClick=\{\(\) => setTaskPanelCollapsed\(value => !value\)\}/);
  assert.match(details, /aria-label=\{taskPanelCollapsed \? 'Développer le panneau de tâche' : 'Replier le panneau de tâche'\}/);
  const taskInfo = details.indexOf('1. Description de la tâche');
  const raci = details.indexOf('2. RACI');
  const documentation = details.indexOf('3. Documentation');
  assert.ok(taskInfo >= 0 && raci > taskInfo && documentation > raci, 'detail sections should stay in the required order');
});


test('selected BPMN element shows a pedagogical type description immediately below its ID', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes("exclusiveGateway: 'Passerelle exclusive : permet de choisir un seul chemin"));
  assert.ok(details.includes("parallelGateway: 'Passerelle parallèle : permet de lancer plusieurs chemins"));
  assert.ok(details.includes("startEvent: 'Événement de début : indique le déclenchement"));
  assert.ok(details.includes("endEvent: 'Événement de fin : indique la fin"));
  assert.match(details, /Identifiant : \{selectedTask\.id\}<\/Typography>\s*<Typography level="body-sm" textColor="neutral">\{getElementTypeDescription\(selectedTask\.type\)\}/);
});


test('deployed frontend exposes a build identifier with a source-derived fallback', async () => {
  const mainContainer = await read('src/MainContainer.tsx');
  const dockerfile = await read('../deploy/coolify/Dockerfile.frontend');
  const compose = await read('../deploy/coolify/compose.yaml');

  assert.ok(mainContainer.includes('VITE_BUILD_ID'));
  assert.ok(mainContainer.includes('Identifiant de version déployée'));
  assert.ok(mainContainer.includes('buildDetails'));
  assert.ok(dockerfile.includes('ARG VITE_BUILD_ID=unknown'));
  assert.ok(dockerfile.includes('SOURCE_HASH='));
  assert.ok(dockerfile.includes('VITE_BUILD_ID="src-$SOURCE_HASH"'));
  assert.ok(compose.includes('VITE_BUILD_ID: ${VITE_BUILD_ID:-${SOURCE_COMMIT:-unknown}}'));
  assert.ok(compose.includes('VITE_BUILD_COMMIT: ${VITE_BUILD_COMMIT:-${SOURCE_COMMIT:-unknown}}'));
  assert.ok(compose.includes('VITE_BUILD_BRANCH: ${VITE_BUILD_BRANCH:-${SOURCE_BRANCH:-unknown}}'));
});

test('V3 viewer three-dot menu exposes role-appropriate resource management actions', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const routes = await read('src/routes.tsx');
  const menuStart = tree.indexOf('<Menu\n      open={Boolean(contextMenu)}');
  const menu = tree.slice(menuStart);

  assert.ok(!tree.includes('onContextMenu'), 'right-click handling is replaced by the explicit menu button');
  assert.ok(tree.includes('folder-tree-actions'));
  assert.ok(tree.includes('setContextMenu({ nodeId, anchorEl: event.currentTarget })'));
  assert.ok(tree.includes('projects/me/workspace'));
  assert.ok(tree.includes('projectModelerResourceIds.includes(resourceId)'));
  assert.ok(tree.includes("borderRadius: '12px'"));
  assert.ok(tree.includes('boxShadow:'));
  assert.ok(tree.includes('background.level1'));
  assert.ok(!menu.includes('Ajouter aux favoris'));
  assert.ok(!menu.includes('Retirer des favoris'));
  assert.ok(tree.includes("sessionRole === 'admin' || sessionRole === 'modeler'"));
  assert.ok(tree.includes('isBpmn && canModifyBpmn(resourceId)'));
  assert.ok(tree.includes('navigate(`/${resourceId}/modeler`)'));
  assert.ok(tree.includes('Modifier dans le modeleur'));
  assert.ok(tree.includes('Partager'));
  assert.ok(tree.includes("const isAdmin = sessionRole === 'admin'"));
  assert.ok(tree.includes('navigate(`/${resourceId}/add?type=folder`)'));
  assert.ok(tree.includes('Créer un répertoire'));
  assert.ok(tree.includes('navigate(`/${resourceId}/add?type=process`)'));
  assert.ok(tree.includes('Créer un processus'));
  assert.ok(tree.includes('Supprimer'));
  assert.doesNotMatch(routes, /lazy: \(\) => import\('\.\/Containers\/ContentViewer'\)/);
});

test('viewer gets a fresh BPMN instance for the selected published version', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');

  assert.ok(details.includes('key={`${resourceId}:${viewerContent.id}`}'));
  assert.match(details, /key=\{\`\$\{resourceId\}:\$\{viewerContent\.id\}\`\}[\s\S]*?resourceId=\{resourceId\}[\s\S]*?contentId=\{viewerContent\.id\}/);
  assert.ok(details.includes('selectedContentId?: string | null'));
  assert.ok(details.includes('contents.find(content => content.id === selectedContentId)'), 'explicit content links include draft snapshots');
  assert.ok(details.includes('const isHistoricalView = Boolean('));
  assert.ok(details.includes('selectedContentId && (!viewerContent || viewerContent.id !== publishedContent?.id)'));
  assert.ok(details.includes('!isHistoricalView && (sessionRole === \'admin\' || sessionRole === \'modeler\')'));
  assert.ok(details.includes('Afficher cette version'));
  assert.ok(details.includes('contentId=${encodeURIComponent(content.id)}') || details.includes('contentId=${encodeURIComponent(content.id)}'));
  assert.ok(layout.includes('useViewerRouteState'));
  assert.ok(routeState.includes("searchParams.get('contentId')"));
  assert.ok(layout.includes('selectedContentId={requestedContentId}'));
});

test('viewer element details editing is permission-gated and saves title, description, RACI and URL', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const styles = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');

  assert.match(details, /fetch\(\`\$\{apiBase\}\/auth\/session\`/);
  assert.match(details, /sessionRole === 'admin' \|\| sessionRole === 'modeler'/);
  assert.match(details, /canEditDescription && !isEditingDescription/);
  assert.match(details, /aria-label="Modifier la fiche de l’élément"/);
  assert.match(details, /<Input[\s\S]*?value=\{titleDraft\}[\s\S]*?onChange=/);
  assert.match(details, /<Textarea[\s\S]*?value=\{descriptionDraft\}[\s\S]*?onChange=/);
  assert.match(details, /<Input[\s\S]*?value=\{urlDraft\}[\s\S]*?onChange=/);
  assert.match(details, /toggleRaciCode/);
  assert.match(details, /attribute: 'responsible'/);
  assert.match(details, /attribute: 'accountable'/);
  assert.match(details, /attribute: 'consulted'/);
  assert.match(details, /attribute: 'informed'/);
  assert.match(details, /<Button[\s\S]*?onClick=\{cancelDescriptionEdit\}[\s\S]*?Annuler/);
  assert.match(details, /<Button[\s\S]*?onClick=\{saveDescriptionEdit\}[\s\S]*?Enregistrer/);
  assert.match(details, /await saveContent\(resourceId, viewerContent\?\.id \?\? publishedContent\.id, \{ content: updatedXml \}\)/);
  assert.match(details, /new XMLSerializer\(\)\.serializeToString\(xmlDocument\)/);
  assert.match(details, /await queryClient\.invalidateQueries\(xmlContentQuery\.queryKey\)/);
  assert.match(details, /sx=\{\{ ml: 1, mt: 0\.25, flex: '0 0 auto' \}\}/);
  assert.match(styles, /\.processTaskPanelEditActions\s*\{[^}]*border-top:/s);
});


test('V3 explorer exposes administrator management actions and their routes', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const routes = await read('src/routes.tsx');
  const processActions = await read('src/Containers/BpmnLayout/components/BusinessProcessActions.tsx');
  const folderActions = await read('src/Containers/BpmnLayout/components/FolderActions.tsx');

  assert.ok(tree.includes('Ouvrir'));
  assert.ok(tree.includes('Modifier dans le modeleur'));
  assert.ok(tree.includes('Supprimer'));
  assert.ok(tree.includes('/share'));
  assert.ok(tree.includes('/add?type=folder'));
  assert.ok(tree.includes('/add?type=process'));
  assert.ok(routes.includes("path: '/:resourceId/delete'"));
  assert.ok(routes.includes("path: '/:resourceId/share'"));
  assert.ok(routes.includes("path: '/:resourceId/add'"));
  assert.ok(routes.includes("path: '/:resourceId/publish'"));
  assert.ok(processActions.includes('Ouvrir le modeleur BPMN'));
  assert.ok(!processActions.includes('Comments'));
  assert.ok(!processActions.includes('Edit Business Process'));
  assert.ok(folderActions.includes('Nouveau dossier'));
  assert.ok(folderActions.includes('Nouveau processus'));
  assert.ok(folderActions.includes('canCreateFolder &&'));
  assert.ok(folderActions.includes('canCreateProcess && projectId'));
});


test('selecting a folder renders its contents instead of an empty folder placeholder', async () => {
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const folderOverview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');
  const processDetails = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(layout.includes("import { FolderOverview } from './FolderOverview'"));
  assert.ok(layout.includes('<FolderOverview resource={resource} />'));
  assert.ok(folderOverview.includes('useQuery(resourcesQuery())'));
  assert.ok(folderOverview.includes('resources.data ?? []'));
  assert.ok(!folderOverview.includes('explorerQuery'));
  assert.ok(folderOverview.includes('activeProject?.processes.forEach'));
  assert.ok(folderOverview.includes('return Array.from(byId.values())'));
  assert.ok(folderOverview.includes(".filter(childResource => allowedIds.has(childResource.id) && (childResource.parentId ?? 'root') === resourceId)"));
  assert.ok(folderOverview.includes('navigate(`/${folder.id}`)'));
  assert.ok(folderOverview.includes('<ProjectProcessOverview'));
  assert.ok(folderOverview.includes("?? 'project-specific'"));
  assert.ok(folderOverview.includes('{folder.name}'));
  assert.ok(folderOverview.includes('Répertoire vide'));
  assert.ok(folderOverview.includes("{resourceId === 'root' ? (activeProject?.name ?? 'Référentiel') : resource.name}"), 'the project root heading should use the active project name or a neutral fallback');
  assert.ok(folderOverview.includes('Aucun descriptif renseigné pour ce répertoire.'));
  assert.ok(processDetails.includes('useProcessDetails(resourceId'));
});

test('viewer keeps the explorer left of the tabs and the element sheet beside the BPMN inside the process tab', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const layoutStart = details.indexOf('className="processViewerLayout processViewerWorkspace"');
  const explorer = details.indexOf('<ViewerExplorerPanel');
  const tabs = details.indexOf('className="processViewerTabs"');
  const processTab = details.indexOf('value={0} className="processViewerTabPanel processViewerProcessTab"');
  const descriptionTab = details.indexOf('value={1} className="processViewerTabPanel"');
  const historyTab = details.indexOf('value={2} className="processViewerTabPanel"');
  const raciTab = details.indexOf('value={3} className="processViewerTabPanel"');
  const inventoryTab = details.indexOf('value={4} className="processViewerTabPanel"');
  const processWorkspace = details.indexOf('className="processViewerProcessWorkspace"', processTab);
  const diagram = details.indexOf('className="processViewerDiagram"', processWorkspace);
  const taskPanel = details.indexOf('className={`processTaskPanel', processWorkspace);
  const workspaceClose = details.indexOf('</Box>\n        </TabPanel>', processWorkspace);
  const processTabClose = details.indexOf('</TabPanel>', processTab);
  const tabsClose = details.indexOf('</Tabs>', inventoryTab);

  assert.ok(layoutStart >= 0, 'viewer workspace should own the explorer and central tabs');
  assert.ok(explorer > layoutStart && explorer < tabs, 'explorer must remain to the left of central tabs');
  // RACI stays a top-level tab; only the element sheet moves beside the BPMN diagram.
  assert.ok(tabs < processTab && processTab < descriptionTab && descriptionTab < historyTab && historyTab < raciTab && raciTab < inventoryTab && tabsClose > inventoryTab, 'diagram, description, history, RACI and inventory must remain ordered in the top-level tabs');
  assert.ok(processWorkspace > processTab && diagram > processWorkspace && taskPanel > diagram && workspaceClose > taskPanel && processTabClose > workspaceClose, 'the BPMN diagram and element sheet must be siblings inside the Vue du processus tab');
  assert.ok(details.slice(processTab, processTabClose).includes('className="processViewerResizeHandle"'), 'the element sheet resize handle must stay with the process workspace');
  assert.ok(details.includes('const [taskPanelCollapsed, setTaskPanelCollapsed] = useState(true)'), 'element sheet must start collapsed');
  assert.ok(details.includes('setTaskPanelCollapsed(!selectedElementId)'), 'clearing the selection on a second click must close the element sheet');
  assert.ok(details.includes('second click on the same BPMN element'), 'the panel behavior must preserve the previous second-click interaction');
  const styles = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');
  const processWorkspaceStyles = styles.slice(styles.indexOf('.processViewerProcessWorkspace {'), styles.indexOf('.processViewerDiagram {'));
  const diagramStyles = styles.slice(styles.indexOf('.processViewerDiagram {'), styles.indexOf('.processViewerDiagramHeader {'));
  const taskPanelStyles = styles.slice(styles.indexOf('.processTaskPanel {'), styles.indexOf('.processTaskPanel.collapsed {'));
  const canvasStart = styles.indexOf('.processViewerCanvas {');
  const canvasStyles = styles.slice(canvasStart, canvasStart + 500);
  assert.ok(processWorkspaceStyles.includes('display: flex;') && processWorkspaceStyles.includes('width: 100%;'), 'BPMN and element sheet must share a horizontal flex workspace');
  assert.ok(diagramStyles.includes('min-width: 0;') && diagramStyles.includes('display: flex;'), 'diagram must flex beside the element sheet');
  assert.ok(taskPanelStyles.includes('flex: 0 0 var(--task-panel-width, 320px)'), 'element sheet must retain its resizable side-panel width');
  assert.ok(canvasStyles.includes('display: flex;') && canvasStyles.includes('flex: 1 1 0;') && canvasStyles.includes('min-height: 0;'), 'BPMN canvas must fill the available diagram area');
  assert.ok(details.includes('aria-label="Copier le lien du processus"') && details.includes('aria-label="Modifier le diagramme BPMN"'));
  assert.ok(details.includes("import '../../../raci.css'"), 'Viewer should reuse the Modeler RACI design system');
  assert.ok(details.includes('className="raci-table"'));
  assert.ok(details.includes('raci-code-badge raci-code-'));
});


test('Viewer version status badges have distinct colors and version actions are permission-gated', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const list = await read('src/Components/BusinessComponents/ProcessContentList/ProcessContentList.tsx');
  const tableHook = await read('src/Components/BusinessComponents/ProcessContentList/hooks/useProcessContentList.ts');
  assert.match(details, /const getContentStatusColor = \(status: ContentStatusEnum\) => \{[\s\S]*?status === ContentStatusEnum\.Published\) return 'success'[\s\S]*?status === ContentStatusEnum\.Draft\) return 'warning'[\s\S]*?return 'neutral'/);
  assert.ok(details.includes('canManageVersions={canManageVersions}'));
  assert.ok(list.includes('canManageVersions = false'));
  assert.ok(list.includes('if (!canManageVersions) return []'));
  assert.match(list, /content\.status === ContentStatusEnum\.Draft[\s\S]*?label: 'Publish'[\s\S]*?label: 'Erase'/);
  assert.match(list, /content\.status === ContentStatusEnum\.Obsolete[\s\S]*?label: 'Erase'/);
  assert.match(tableHook, /let color: 'success' \| 'warning' \| 'neutral' = 'neutral'[\s\S]*?status === ContentStatusEnum\.Published[\s\S]*?color = 'success'[\s\S]*?status === ContentStatusEnum\.Draft[\s\S]*?color = 'warning'/);
  assert.ok(details.includes("const canManageVersions = !isHistoricalView && (sessionRole === 'admin' || sessionRole === 'modeler')"));
  assert.ok(details.includes('readOnlyShell && !canManageVersions'));
});

test('RACI activity links select the BPMN element and return to the process tab', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  assert.ok(details.includes('setActiveViewerTab(0)'));
  assert.ok(details.includes('onElementSelect?.(activity.elementId)'));
  assert.ok(details.includes('CenterFocusStrong'));
  assert.ok(details.includes('aria-label="Voir l’activité dans le BPMN"'));
  assert.ok(details.includes('<Tabs value={activeViewerTab}'));
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  assert.ok(viewer.includes("selection?.select?.([element])"));
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  assert.ok(css.includes('.djs-element.selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)'));
  assert.ok(css.includes('stroke-width: 4px !important'));
  assert.ok(!css.includes('.djs-element.selected .djs-outline'));
});


test('modeler exposes undo/redo controls and guards unsaved navigation', async () => {
  const hook = await read('src/Containers/ContentModeler/hooks/useModeler.ts');
  const actionBar = await read('src/Containers/ContentModeler/components/ModelerActionBar.tsx');
  const container = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');

  assert.ok(hook.includes("get('commandStack')"));
  assert.ok(hook.includes("get('commandStack') as any)?.undo?.()"));
  assert.ok(hook.includes("get('commandStack') as any)?.redo?.()"));
  assert.ok(hook.includes('savedStackIndexRef'));
  assert.ok(actionBar.includes('Annuler la dernière modification'));
  assert.ok(actionBar.includes('Rétablir la dernière modification'));
  assert.ok(container.includes('useBlocker(({ nextLocation }) =>'));
  assert.ok(container.includes('nextLocation.pathname !== location.pathname'));
  assert.ok(container.includes('!nextLocation.pathname.startsWith(`${location.pathname}/`)'));
  assert.ok(container.includes('const location = useLocation()'));
  assert.ok(container.includes('const returnToUrl = proposalId && (sourceResourceId || resource?.sourceResourceId)'));
  assert.ok(actionBar.includes('to={returnToUrl ?? `/${resourceId}`}'));
  assert.ok(container.includes("if (reviewRemarksMode || approvedProposalMode) homeSaveActionLabel = 'Enregistrer et quitter'"));
  assert.ok(container.includes('beforeunload'));
  assert.ok(container.includes('Continuer l’édition'));
  assert.ok(container.includes('Abandonner les modifications'));
  assert.ok(container.includes('Enregistrer sans publier'));
  assert.ok(container.includes('Enregistrer et publier'));
});

test('authorized modeler shortcut is beside the process link and RACI icon stays inline', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const hook = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');

  const versionList = await read('src/Components/BusinessComponents/ProcessContentList/ProcessContentList.tsx');
  assert.ok(!details.includes('title="Ouvrir dans le modeleur"'));
  assert.ok(!details.includes('AccountTreeOutlined'));
  assert.ok(details.includes('onContentViewerLinkCopy(viewerContent.id)'));
  assert.ok(details.includes('title="Modifier le diagramme BPMN"'));
  assert.ok(details.includes('onClick={onModelerClick}'));
  assert.ok(details.includes('{canEditDescription && ('));
  assert.ok(versionList.includes("label: 'Ouvrir dans le modeleur'"));
  assert.ok(versionList.includes('<AccountTreeOutlined fontSize="small" />'));
  assert.ok(versionList.includes('contentId=${encodeURIComponent(content.id)}'));
  assert.ok(details.includes('<Tab value={3}>RACI</Tab>'));
  assert.ok(details.includes('useViewerRaciAnalysis(xmlContent)'));
  assert.ok(hook.includes("searchParams.get('contentId')"));
  assert.ok(hook.includes('contents?.find(content => content.id === requestedContentId)'));
});


test('V3 process details exposes a central editable description tab only to authorized roles', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /<Tab value=\{1\}>Description<\/Tab>/);
  assert.match(details, /<TabPanel value=\{1\} className="processViewerTabPanel">[\s\S]*?Description du processus[\s\S]*?processDescriptionDraft/s);
  assert.match(details, /const canEditDescription = !isHistoricalView && \(sessionRole === 'admin' \|\| sessionRole === 'modeler'\);/);
  assert.match(details, /await updateResource\(resourceId,\s*\{[\s\S]*?description: processDescriptionDraft/s);
  assert.match(details, /queryClient\.invalidateQueries\(getResourceQuery\(resourceId\)\.queryKey\)/);
  assert.match(details, /<Tab value=\{2\}>Historique des versions<\/Tab>/);
  assert.match(details, /<Tab value=\{3\}>RACI<\/Tab>/);
});


test('V3 central viewer exposes the data inventory and saves it through the existing BPMN content API', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const inventory = await read('src/Components/BusinessComponents/ProcessDetails/DataInventory.tsx');

  assert.match(details, /<Tab value=\{4\}>Informations documentées<\/Tab>/);
  assert.match(details, /<TabPanel value=\{4\} className="processViewerTabPanel">[\s\S]*?<DataInventory/s);
  assert.match(details, /await saveContent\(resourceId, viewerContent\.id, \{ content: updatedXml \}\)/);
  assert.match(details, /canEdit=\{canEditDescription\}/);
  assert.match(inventory, /getElementsByTagNameNS\(NS, 'source'\)/);
  assert.match(inventory, /getElementsByTagNameNS\(NS, 'manifest'\)/);
  assert.match(inventory, /hasInventoryManifest \|\| saved\.length/);
  assert.match(inventory, /inventory:manifest/);
  assert.match(inventory, /dataObjectReference.*dataStoreReference/s);
  assert.match(inventory, /Gestion des accès/);
  assert.match(inventory, /Personnes autorisées/);
  assert.match(inventory, /Modalités de restriction/);
});

test('canonical process viewer restores element selection and RACI tab from route query parameters', async () => {
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const routeState = await read('src/shared/hooks/useViewerRouteState.ts');
  const selectionState = await read('src/shared/hooks/useViewerSelectionState.ts');

  assert.ok(routeState.includes("searchParams.get('elementId')"));
  assert.ok(routeState.includes("searchParams.get('raci') === '1'"));
  assert.ok(layout.includes('useViewerRouteState()'));
  assert.ok(layout.includes('useViewerSelectionState('));
  assert.ok(layout.includes('selectedElementId={selectedElementId}'));
  assert.ok(layout.includes('requestedRaciView={requestedRaciView}'));
  assert.ok(selectionState.includes('setSelectedElementId(requestedElementId)'));
  assert.ok(details.includes('onElementSelect?.(activity.elementId)'));
  assert.match(details, /if \(requestedRaciView\) setActiveViewerTab\(3\)/);
});


test('legacy content-viewer URLs preserve the requested version in the canonical process viewer', async () => {
  const routes = await read('src/routes.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(routes, /path: '\/:resourceId\/viewer\/:contentId'[\s\S]*?loader:/);
  assert.ok(routes.includes("url.searchParams.set('contentId', params.contentId ?? '')"));
  assert.ok(routes.includes('url.searchParams.toString()'));
  assert.match(details, /let viewerContent = publishedContent \?\? undefined;/);
  assert.match(details, /if \(selectedContentId\) \{[\s\S]*?viewerContent = contents\.find\(content => content\.id === selectedContentId\)/);
  assert.match(details, /selectedContentId && \(!viewerContent \|\| viewerContent\.id !== publishedContent\?\.id\)/);
  assert.ok(!details.includes(') ?? publishedContent;'));
});


test('ProcessDetails distinguishes an unavailable requested version from a process without published versions', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes('La version demandée est indisponible ou ne peut pas être consultée.'));
  assert.ok(details.includes("'No published version'"));
  assert.match(details, /selectedContentId\s*\?\s*'La version demandée est indisponible ou ne peut pas être consultée\.'\s*:\s*'No published version'/);
});

test('ProcessDetails never falls back to latest published content for an explicit missing or historical contentId', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /if \(selectedContentId\) \{[\s\S]*?viewerContent = contents\.find\(content => content\.id === selectedContentId\)/);
  assert.match(details, /const isHistoricalView = Boolean\([\s\S]*?selectedContentId && \(!viewerContent \|\| viewerContent\.id !== publishedContent\?\.id\)/);
  assert.match(details, /else if \(!viewerContent && isProjectVariant\)/);
});

test('V3 exposes one process viewer and redirects legacy content-viewer URLs', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const routes = await read('src/routes.tsx');
  const shared = await read('src/Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel.tsx');

  assert.ok(details.includes("import { ViewerExplorerPanel } from '../ViewerExplorerPanel/ViewerExplorerPanel'"));
  assert.ok(details.includes('variant="process-details"'));
  assert.ok(details.includes('showHistory'));
  assert.ok(shared.includes("variant: 'process-details' | 'projects-overview'"));
  assert.ok(shared.includes('<FolderTree selectedId={selectedId} onNodeClick={onNodeClick} />'));
  assert.ok(shared.includes('onBack'));
  assert.ok(shared.includes('onForward'));
  assert.doesNotMatch(routes, /lazy: \(\) => import\('\.\/Containers\/ContentViewer'\)/);
});

test('modeler publication route stays inside the modeler and returns to the Viewer after publish', async () => {
  const routes = await read('src/routes.tsx');
  const modeler = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const publish = await read('src/Containers/PublishResource/PublishResource.container.tsx');
  const publishHook = await read('src/Containers/PublishResource/hooks/usePublishResource.ts');

  assert.match(routes, /path: '\/:resourceId\/modeler'[\s\S]*?children: \[[\s]*\{\s*path: 'publish'/);
  assert.ok(modeler.includes('${resourceId}/modeler/publish'));
  assert.ok(publish.includes('<Navigate to={`/${resource?.id}`} replace />'));
  assert.ok(!publish.includes("location.pathname.endsWith('/modeler/publish')"));
  assert.ok(publishHook.includes("return navigate('..')"));
});


test('version comparison route is exposed in the authenticated V3 viewer', async () => {
  const routes = await read('src/routes.tsx');
  assert.ok(routes.includes("path: '/:resourceId/compare/:leftContentId/:rightContentId'"));
  assert.ok(routes.includes("lazy: () => import('./Containers/ContentCompare')"));
});

test('BPMN version diff compares older to newer and marks changes on the correct side', async () => {
  const compare = await read('src/Components/BusinessComponents/Compare/hooks/useCompare.ts');
  assert.ok(compare.includes('diff(\n        leftViewer.getDefinitions(),\n        rightViewer.getDefinitions(),'));
  assert.ok(compare.includes("highlight(rightViewer, obj.id, 'diff-added')"));
  assert.ok(compare.includes("highlight(leftViewer, obj.id, 'diff-removed')"));
});


test('read-only version history can select and compare exactly two historical versions', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const hook = await read('src/Components/BusinessComponents/ProcessDetails/hooks/useProcessDetails.ts');

  assert.ok(details.includes('Comparer les deux versions sélectionnées'));
  assert.ok(details.includes('checked={contentIdsToCompare.includes(content.id)}'));
  assert.ok(details.includes('onCompareClick(contentIdsToCompare[0], contentIdsToCompare[1])'));
  assert.ok(hook.includes('const selectedIds = Array.from(new Set(contentIds))'));
  assert.ok(hook.includes('setIsCompareDisabled(selectedIds.length !== 2)'));
});

test('dark-mode BPMN selection follows the actual SVG geometry', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.ok(css.includes('[data-joy-color-scheme=\'dark\'] .modelerContainer .djs-element.selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)'));
  assert.ok(css.includes('[data-joy-color-scheme=\'dark\'] .processViewerDiagramContent .djs-element.selected:not(.djs-label) .djs-visual > :first-child:not(text):not(tspan)'));
  assert.ok(css.includes('stroke: #1976d2 !important'));
  assert.ok(!css.includes('.djs-element.selected .djs-outline'));
});

test('explorer and element-details panel headers share one theme-aware visual contract', async () => {
  const explorer = await read('src/Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const sharedCss = await read('src/Components/BusinessComponents/ViewerExplorerPanel/ViewerPanel.css');

  assert.ok(explorer.includes('viewerPanelHeader'));
  assert.ok(details.includes('viewerPanelHeader processTaskPanelHeader'));
  assert.ok(sharedCss.includes('.viewerPanelHeader'));
  assert.ok(sharedCss.includes('var(--joy-palette-background-level1'));
  assert.ok(sharedCss.includes('var(--joy-palette-divider'));
});

test('version comparison waits for both resource records as well as both BPMN versions', async () => {
  const compareData = await read('src/Containers/ContentCompare/hooks/useCompareData.ts');

  assert.ok(compareData.includes('isLeftResourceLoading'));
  assert.ok(compareData.includes('isRightResourceLoading'));
  assert.ok(compareData.includes('isLeftResourceLoading ||'));
  assert.ok(compareData.includes('isRightResourceLoading ||'));
});


test('dark theme does not add borders to plain icon buttons', async () => {
  const styles = await read('src/styles.css');

  assert.ok(styles.includes('.MuiIconButton-root.MuiIconButton-variantPlain'));
  assert.ok(styles.includes('background: transparent;'));
  assert.ok(styles.includes('border: 0;'));
  assert.ok(!styles.includes('[data-joy-color-scheme=\'dark\'] .MuiIconButton-root:hover {'));
});

test('process modeler action does not duplicate the edit icon', async () => {
  const actions = await read('src/Containers/BpmnLayout/components/BusinessProcessActions.tsx');

  assert.ok(!actions.includes('EditOutlined'));
  assert.ok(!actions.includes('leftIcon='));
  assert.ok(actions.includes('onClick={onModelerBtnClick}'));
});


test('description, version history, RACI and documented information stay top-aligned', async () => {
  const styles = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');

  assert.ok(styles.includes('align-items: stretch;'));
  assert.ok(styles.includes('justify-content: flex-start;'));
  assert.ok(styles.includes('flex: 1 1 0;'));
  assert.ok(styles.includes('margin-block: 0 auto;'));
  assert.ok(styles.includes('.processViewerTabPanel:not(.processViewerProcessTab) > .processViewerInfo'));
  assert.ok(styles.includes('.processViewerTabPanel:not(.processViewerProcessTab) > .processViewerInfo.processViewerRaci'));
});


test('user administration uses a dedicated breadcrumb route and grouped account actions', async () => {
  const accounts = await read('src/Containers/UserAccounts/index.tsx');
  const layout = await read('src/Containers/OrganizationAdmin/OrganizationAdminLayout.tsx');
  const routes = await read('src/routes.tsx');

  assert.match(routes, /path: '\/organization\/users\/\:username'/);
  assert.match(accounts, /useParams<\{ username\?: string \}>/);
  assert.match(accounts, /id: 'administration', label: 'Administration'/);
  assert.match(accounts, /id: 'users', label: 'Utilisateurs'/);
  assert.match(layout, /<Breadcrumbs breadcrumbItems=\{breadcrumbs\} \/>/);
  assert.match(accounts, /!username && <>/);
  assert.match(accounts, /Actions groupées/);
  assert.match(accounts, /Associer à un projet/);
  assert.match(accounts, /Désactiver les comptes sélectionnés/);
});

test('project administration exposes a nested project-process tree and grouped actions', async () => {
  const admin = await read('src/Containers/OrganizationAdmin/OrganizationAdmin.container.tsx');

  assert.match(admin, /Arborescence des projets et processus/);
  assert.match(admin, /Affecter un utilisateur aux projets sélectionnés/);
  assert.match(admin, /Associer les processus sélectionnés à un projet/);
  assert.doesNotMatch(admin, /activeSection === 'settings'/);
});


test('active project selector is selectable and carries project visual identity', async () => {
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const activeProject = await read('src/shared/hooks/useActiveProject.ts');

  assert.match(navigation, /<Select<string>/);
  assert.match(navigation, /value=\{activeProjectId \?\? undefined\}/);
  assert.match(navigation, /placeholder="Choisir un projet…"/);
  assert.match(navigation, /setActiveProject\(value\)/);
  assert.match(navigation, /project\.color/);
  assert.match(navigation, /activeProject\.trigram/);
  assert.match(activeProject, /color: string/);
  assert.match(activeProject, /trigram: string \| null/);
  assert.match(activeProject, /icon: string/);
});

test('project home and central folder overview follow the active project', async () => {
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');

  assert.match(layout, /isRoot\(resourceId\) \? \(activeProject\?\.name \?\? 'Référentiel'\)/);
  assert.match(overview, /projectProcessIds/);
  assert.match(overview, /allowedIds\.has\(childResource\.id\)/);
  assert.match(overview, /Sélectionnez un projet/);
  assert.match(overview, /ProjectProcessOverview/);
  assert.match(overview, /activeProject\.processes\.map/);
});

test('recent and favorite resources retain their project context', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');

  assert.match(tree, /\$\{activeProjectId\}::\$\{processId\}/);
  assert.match(tree, /projects\.filter\(project => project\.processes\.some/);
  assert.match(tree, /setActiveProject\(projectId\)/);
  assert.match(tree, /project\.color/);
  assert.match(tree, /getProjectTrigram\(project\.name, project\.trigram\)/);
});

test('project administrators can configure the color of the generated trigram badge', async () => {
  const admin = await read('src/Containers/Projects/Projects.container.tsx');
  assert.match(admin, /Input type="color"/);
  assert.match(admin, /Aperçu du badge/);
  assert.ok(admin.includes('getProjectTrigram(project.name, projectTrigram)'));
  assert.match(admin, /value=\{projectTrigram\}/);
  assert.match(admin, /trigram: projectTrigram/);
  assert.match(admin, /color: projectColor/);
  assert.match(admin, /canManageProjectIdentity/);
  assert.doesNotMatch(admin, /Pictogramme/);
});


test('the root workspace replaces the former home dashboard and project viewer page', async () => {
  const routes = await read('src/routes.tsx');
  const breadcrumbs = await read('src/Containers/BpmnLayout/hooks/useBpmnLayoutBreadcrumbs.ts');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');
  const legacyRedirect = await read('src/Containers/ProjectWorkspaceRedirect/index.tsx');

  assert.match(routes, /path: '\/home'\s*,\s*loader: \(\) => redirect\('\/root'\)/);
  assert.match(routes, /path: '\/projects\/:projectId\/viewer'[\s\S]*?ProjectWorkspaceRedirect/);
  assert.match(routes, /path: '\/projects'[\s\S]*?import\('\.\/Containers\/Projects'\)/);
  assert.match(routes, /path: '\/projects\/:projectId'[\s\S]*?import\('\.\/Containers\/Projects'\)/);
  assert.match(overview, /ProjectProcessOverview/);
  assert.match(overview, /activeProject\.description/);
  assert.match(legacyRedirect, /setActiveProject\(projectId\)/);
  assert.match(breadcrumbs, /label: activeProject\.name/);
  assert.match(breadcrumbs, /id: 'home'.*label: 'Tous les projets'/);
  assert.doesNotMatch(breadcrumbs, /label: 'Référentiel'/);
  assert.doesNotMatch(navigation, /label: 'Accueil'|label: 'Projets'/);
  assert.match(navigation, /globalRole === 'admin'[\s\S]*?>\s*Administration\s*<\/Button>/);
  assert.ok(navigation.includes('<UserAccountMenu />'), 'account menu remains available');
});


test('Viewer opens at 1:1 and uses native fit-to-viewport for Ajuster', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.match(hook, /const showDiagramAtActualSize = \(\) =>/);
  assert.match(hook, /One diagram unit per screen pixel/);
  assert.match(hook, /canvas\.viewbox\(\{[\s\S]*?width,[\s\S]*?height,/);
  assert.ok((hook.match(/window\.requestAnimationFrame/g) ?? []).length >= 2);
  assert.ok(hook.includes('showDiagramAtActualSize();'));
  assert.match(hook, /const fitDiagram = \(\) =>[\s\S]*?canvas\.resized\?\.\(\);[\s\S]*?canvas\.zoom\('fit-viewport'\)/);
  assert.match(hook, /const resetZoom = \(\) =>[\s\S]*?\.zoom\(1\)/);
  assert.match(viewer, /onClick=\{fitDiagram\}[^>]*aria-label="Ajuster à la fenêtre"/);
});

test('fullscreen targets the complete process workspace and refits after both transitions', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const styles = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');
  assert.ok(details.includes('const processWorkspaceRef = useRef<HTMLDivElement>(null)'));
  assert.ok(details.includes('fullscreenTargetRef={processWorkspaceRef}'));
  assert.ok(viewer.includes('fullscreenTargetRef?: React.RefObject<HTMLElement>'));
  assert.ok(viewer.includes('fullscreenTargetRef?.current ?? viewerShellRef.current'));
  assert.ok(viewer.includes('active || document.fullscreenElement === null'));
  assert.ok(viewer.includes("isShellFullscreen ? ' is-fullscreen' : ''"));
  assert.ok(styles.includes('.processViewerProcessWorkspace:fullscreen'));
  assert.ok(styles.includes(':fullscreen .processTaskPanel'));
});

test('project home action is positioned below the explorer search field', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const searchIndex = tree.indexOf('placeholder="Rechercher une ressource…"', tree.indexOf('return ('));
  const homeIndex = tree.indexOf('Tous les projets', searchIndex);
  assert.ok(searchIndex >= 0);
  assert.ok(homeIndex > searchIndex);
});

test('project identities use generated trigrams and retain configurable colors', async () => {
  const helper = await read('src/shared/helpers/projectTrigram.ts');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const projects = await read('src/Containers/Projects/Projects.container.tsx');
  assert.ok(helper.includes('export const getProjectTrigram'));
  assert.ok(navigation.includes('getProjectTrigram(project.name, project.trigram)'));
  assert.ok(tree.includes('getProjectTrigram(project.name, project.trigram)'));
  assert.ok(projects.includes('getProjectTrigram(project.name, project.trigram)'));
  assert.ok(projects.includes('color: projectColor'));
});

test('all-projects home reuses the Viewer workspace layout and shows four useful indicators', async () => {
  const projects = await read('src/Containers/Projects/Projects.container.tsx');
  const explorer = await read('src/Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel.tsx');
  assert.ok(projects.includes('variant="projects-overview"'));
  assert.ok(projects.includes('className="processViewerLayout processViewerWorkspace"'));
  assert.ok(projects.includes('className="processViewerResizeHandle"'));
  assert.ok(projects.includes('Projets accessibles'));
  assert.ok(projects.includes('Processus distincts'));
  assert.ok(projects.includes('Processus publiés'));
  assert.ok(projects.includes('Modifiés sur 30 jours'));
  assert.ok(projects.includes('className="processViewerDiagram processViewerInfo projectsOverviewPanel"'));
  assert.ok(explorer.includes("variant: 'process-details' | 'projects-overview'"));
});


test('canonical full-screen process viewer opens the element sheet on BPMN selection', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.ok(details.includes('const processWorkspaceRef = useRef<HTMLDivElement>(null)'));
  assert.ok(details.includes('fullscreenTargetRef={processWorkspaceRef}'));
  assert.ok(details.includes('selectedTask ?'));
  assert.ok(details.includes('Fiche de l’élément'));
  assert.ok(details.includes('selectedElementId'));
  assert.ok(viewer.includes('fullscreenTargetRef'));
});

test('all-projects workspace reuses the shared Viewer breadcrumb header', async () => {
  const projects = await read('src/Containers/Projects/Projects.container.tsx');
  const sharedHeader = await read('src/Components/GenericComponents/Header/Header.tsx');
  const breadcrumbs = await read('src/Components/GenericComponents/Breadcrumbs/Breadcrumbs.tsx');

  assert.ok(projects.includes("import { Header } from '../../Components/GenericComponents/Header/Header'"));
  assert.ok(projects.includes('<Header'));
  assert.ok(projects.includes('title="Tous les projets"'));
  assert.ok(projects.includes("breadcrumbs={[{ id: 'home', label: 'Tous les projets', to: '/projects' }]}"));
  assert.ok(sharedHeader.includes('<Breadcrumbs isLoading={isLoading} breadcrumbItems={breadcrumbs || []} />'));
  assert.ok(breadcrumbs.includes('aria-label="breadcrumbs"'));
});

test('project administration persists a member-backed default validator and documents process-pilot precedence', async () => {
  const page = await read('src/Containers/Projects/Projects.container.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/project.ormEntity.ts');
  const migration = await read('../backend/migrations/20261106_add_project_default_validator.sql');
  const migrationDockerfile = await read('../deploy/coolify/Dockerfile.migrations');
  const compose = await read('../deploy/coolify/compose.yaml');

  assert.ok(page.includes('defaultValidatorUserId: string | null'));
  assert.ok(page.includes('Validateur par défaut du projet'));
  assert.ok(page.includes('Le pilote indiqué dans le processus reste prioritaire.'));
  assert.ok(page.includes('apiClient.put(`/projects/${projectId}`, {'));
  assert.ok(controller.includes('The default validator must be a member of this project'));
  assert.ok(controller.includes('project.defaultValidatorUserId === userId'));
  assert.ok(entity.includes('defaultValidatorUserId: string | null'));
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS "defaultValidatorUserId"'));
  assert.ok(migrationDockerfile.includes('20261106_add_project_default_validator.sql'));
  assert.ok(compose.includes('/opt/migrations/20261106_add_project_default_validator.sql'));
  assert.ok(page.includes('<Tab value={3}>Validation</Tab>'));
});

test('project trigram is editable, validated and persisted by the project API', async () => {
  const page = await read('src/Containers/Projects/Projects.container.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts');
  const entity = await read('../backend/src/modules/ProjectContext/infrastructure/entities/project.ormEntity.ts');
  const migration = await read('../backend/migrations/20261108_v3_project_trigram.sql');
  const migrationDockerfile = await read('../deploy/coolify/Dockerfile.migrations');
  const compose = await read('../deploy/coolify/compose.yaml');
  const validateWorkflow = await read('../.github/workflows/validate.yml');

  assert.ok(page.includes('Trigramme du projet'));
  assert.ok(page.includes('trigram: projectTrigram.trim() || null'));
  assert.ok(controller.includes('validateProjectTrigram'));
  assert.ok(controller.includes('Project trigram must contain exactly three letters or digits'));
  assert.ok(entity.includes('trigram: string | null'));
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS trigram'));
  assert.ok(migrationDockerfile.includes('20261108_v3_project_trigram.sql'));
  assert.ok(compose.includes('/opt/migrations/20261108_v3_project_trigram.sql'));
  assert.ok(validateWorkflow.includes('/opt/migrations/20261108_v3_project_trigram.sql'));
  assert.ok(validateWorkflow.includes("column_name='trigram'"));
});

test('project administration uses the shared breadcrumb header and Viewer-aligned surface', async () => {
  const page = await read('src/Containers/Projects/Projects.container.tsx');

  assert.ok(page.includes('<Header'));
  assert.ok(page.includes("{ id: 'home', label: 'Tous les projets', to: '/projects' }"));
  assert.ok(page.includes("bgcolor: 'background.surface'"));
  assert.ok(page.includes("borderColor: 'neutral.outlinedBorder'"));
  assert.ok(page.includes('borderRadius: 0'));
});

test('canonical Viewer reports declared RACI actors that are not used', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes('raciAnalysis.unusedActors.length > 0'));
  assert.ok(details.includes('Acteurs déclarés mais non utilisés'));
  assert.ok(details.includes('raciAnalysis.unusedActors.join'));
});


test('process viewer resumes an existing open proposal and exposes its status', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const proposals = await read('src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts');
  assert.ok(details.includes('isLoading: activeProposalLoading'));
  assert.ok(details.includes('if (currentActiveProposal)'));
  assert.ok(details.includes('activeProposal.sourceResourceId === resourceId'));
  assert.ok(details.includes('activeProposal.sourcePublishedContentId === viewerContent?.id'));
  assert.ok(details.includes('cloneContentId'));
  assert.ok(proposals.includes('proposal.cloneContentId'));
  assert.ok(controller.includes('cloneDraftByResourceId.get(proposal.cloneResourceId)?.id ?? null'));
  assert.ok(details.includes('Reprendre la demande en cours'));
  assert.ok(details.includes('Une demande de modification est déjà ouverte'));
  assert.ok(details.includes('Impossible de vérifier les demandes déjà ouvertes'));
});

test('leaving the proposal modeler clears the shared BPMN selection before destroying it', async () => {
  const modeler = await read('src/shared/hooks/useModelerInstance.ts');
  assert.ok(modeler.includes("modeler.get('selection')"));
  assert.ok(modeler.includes('selection?.select?.([])'));
  assert.ok(modeler.indexOf('selection?.select?.([])') < modeler.indexOf('modeler.destroy()'));
});


test('proposal modeler waits for its BPMN XML and reports loading failures instead of showing an empty diagram', async () => {
  const contentHook = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');
  const modelerHook = await read('src/Containers/ContentModeler/hooks/useModeler.ts');
  const container = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const actionBar = await read('src/Containers/ContentModeler/components/ModelerActionBar.tsx');

  assert.ok(contentHook.includes('draftXmlContentIsError'));
  assert.ok(contentHook.includes('getContentQuery'));
  assert.ok(contentHook.includes('requestedContentId'));
  assert.ok(contentHook.includes('contents !== undefined'));
  assert.ok(modelerHook.includes('content === undefined'));
  assert.ok(container.includes('Impossible de charger le diagramme BPMN de cette demande'));
  assert.ok(container.includes('modelerReady={isModelerReady}'));
  assert.ok(actionBar.includes('disabled={!modelerReady}'));
});


test('approved BPMN proposals are read-only until the approved snapshot is published', async () => {
  const container = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const modeler = await read('src/Components/BusinessComponents/Modeler/Modeler.tsx');
  const actionBar = await read('src/Containers/ContentModeler/components/ModelerActionBar.tsx');
  const styles = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.ok(container.includes('readOnly={approvedProposalMode}'));
  assert.ok(container.includes('isDirty || publishingApprovedProposal'));
  assert.ok(modeler.includes('modelerReadOnly'));
  assert.ok(actionBar.includes('{!readOnly && ('));
  assert.ok(styles.includes('.modelerReadOnly #diagramContainer'));
});

test('rejecting a BPMN remark requires a reason in the UI and backend', async () => {
  const panel = await read('src/Containers/ContentModeler/components/ProposalRemarksPanel.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts');
  const controllerSpec = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.spec.ts');

  assert.ok(panel.includes('Motif de décision (obligatoire pour refuser)'));
  assert.ok(panel.includes("!decisionComments[remark.id]?.trim()"));
  assert.ok(controller.includes('Un motif est obligatoire pour refuser une remarque'));
  assert.ok(controllerSpec.includes("requires a reason when rejecting a remark"));
});

test('BPMN remark clarification stays in the remark event thread', async () => {
  const panel = await read('src/Containers/ContentModeler/components/ProposalRemarksPanel.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts');
  const controllerSpec = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.spec.ts');

  assert.ok(panel.includes('/clarification'));
  assert.ok(panel.includes('/response'));
  assert.ok(panel.includes('Précision demandée'));
  assert.ok(panel.includes('Réponse de l’auteur'));
  assert.ok(panel.includes('awaitingAuthorResponse'));
  assert.ok(panel.includes('En attente de la réponse de l’auteur avant la décision finale.'));
  assert.ok(controller.includes('remark_clarification_requested'));
  assert.ok(controller.includes('remark_author_responded'));
  assert.ok(controller.includes('canRespond:'));
  assert.ok(controllerSpec.includes('allows the designated validator to request clarification'));
  assert.ok(controllerSpec.includes('allows only the remark author to answer'));
  assert.ok(controllerSpec.includes('does not allow another project member to answer'));
});

test('project home falls back to workspace process membership when the global resource list fails', async () => {
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');
  assert.ok(overview.includes('resources.isError && !activeProject'));
  assert.ok(overview.includes('The project workspace can still provide the process list'));
  assert.ok(overview.includes('Les processus associés au projet sont affichés'));
  assert.ok(overview.includes('activeProject?.processes.forEach'));
});
