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



test('Parallel Gateway inner plus is violet without changing the diamond fill', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');

  assert.match(css, /\.djs-element\.bpmn-gateway-parallel \.djs-visual > path\s*\{[^}]*fill:\s*#6a0dad\s*!important;[^}]*stroke:\s*#6a0dad\s*!important;/s);
  assert.match(css, /\.djs-element\.bpmn-gateway-event-based \.djs-visual > \*/);
});

test('cross-process annotation search uses the Viewer selection query parameter', async () => {
  const provider = await read('src/extensions/recherche/recherche-repository-provider.ts');
  const module = await read('src/extensions/recherche/recherche-module.ts');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');

  assert.ok(provider.includes('`/${resource.id}?elementId=${encodeURIComponent(id)}`'));
  assert.ok(module.includes("target.searchParams.set('elementId', result.id)"));
  assert.ok(layout.includes("searchParams.get('elementId')"));
  assert.ok(layout.includes('setSelectedElementId(requestedElementId)'));
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
  assert.ok(processLinks.includes("getElementsByTagNameNS('*', 'BPMNShape')"));
  assert.ok(processLinks.includes("shape.getAttribute('isExpanded') === 'false'"));
  assert.ok(processLinks.includes("shape.getAttribute('bpmnElement')?.trim() || ''"));
  const navigation = await read('src/shared/hooks/useCallActivityNavigation.ts');
  assert.ok(navigation.includes('element?.businessObject?.di?.isExpanded'));
  assert.ok(navigation.includes("return expandedState === false || expandedState === 'false'"));
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
  assert.ok(breadcrumbs.includes('useFolderTree(resourceId)'));
  assert.ok(breadcrumbs.includes('const treePath = findPath(dataTree)'));
  assert.ok(breadcrumbs.includes('to: node.id === \'root\' ? \'/root\' : `/${node.targetId ?? node.id}`'));
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


test('detail panel starts collapsed, opens on element selection and exposes task/RACI/documentation in order', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /useState\(true\);[\s\S]*?taskPanelCollapsed/);
  assert.match(details, /if \(selectedElementId\) setTaskPanelCollapsed\(false\)/);
  assert.match(details, /className="processTaskPanelHeader"[\s\S]*?onClick=\{\(\) => setTaskPanelCollapsed\(value => !value\)\}/);
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
  assert.ok(compose.includes('VITE_BUILD_ID: ${VITE_BUILD_ID:-unknown}'));
});

test('viewer gets a fresh BPMN instance when the selected process or published version changes', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(details.includes('key={`${resourceId}:${publishedContent.id}`}'));
  assert.match(details, /key=\{\`\$\{resourceId\}:\$\{publishedContent\.id\}\`\}[\s\S]*?resourceId=\{resourceId\}[\s\S]*?contentId=\{publishedContent\.id\}/);
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
  assert.match(details, /await saveContent\(resourceId, publishedContent\.id, \{ content: updatedXml \}\)/);
  assert.match(details, /new XMLSerializer\(\)\.serializeToString\(xmlDocument\)/);
  assert.match(details, /await queryClient\.invalidateQueries\(xmlContentQuery\.queryKey\)/);
  assert.match(details, /sx=\{\{ ml: 1, mt: 0\.25, flex: '0 0 auto' \}\}/);
  assert.match(styles, /\.processTaskPanelEditActions\s*\{[^}]*border-top:/s);
});
