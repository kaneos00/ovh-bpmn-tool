import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('Viewer fit uses the first limiting dimension and preserves the complete BPMN bounds', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.ok(hook.includes('const scale = Math.min('));
  assert.ok(hook.includes('availableWidth / diagramWidth'));
  assert.ok(hook.includes('availableHeight / diagramHeight'));
  assert.ok(hook.includes('canvas.viewbox({'));
  assert.ok(hook.includes('width: containerWidth / scale'));
  assert.ok(hook.includes('height: containerHeight / scale'));
  assert.doesNotMatch(hook, /!element\.labelTarget|!element\.waypoints/);
  assert.doesNotMatch(hook, /zoom\('fit-viewport'\)/);
});

test('fullscreen targets the complete process workspace so the element sheet remains visible', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const styles = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');

  assert.ok(details.includes('const processWorkspaceRef = useRef<HTMLDivElement>(null)'));
  assert.ok(details.includes('ref={processWorkspaceRef}'));
  assert.ok(details.includes('fullscreenTargetRef={processWorkspaceRef}'));
  assert.ok(viewer.includes('fullscreenTargetRef?: React.RefObject<HTMLElement>'));
  assert.ok(viewer.includes('fullscreenTargetRef?.current ?? viewerShellRef.current'));
  assert.match(styles, /\.processViewerProcessWorkspace:fullscreen\s*\{/);
  assert.match(styles, /\.processViewerProcessWorkspace:fullscreen \.processTaskPanel/);
});

test('project explorer places the projects home action below the search field', async () => {
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const searchIndex = tree.indexOf('placeholder="Rechercher une ressource…"', tree.indexOf('return ('));
  const homeIndex = tree.indexOf('Tous les projets', searchIndex);

  assert.ok(searchIndex >= 0);
  assert.ok(homeIndex > searchIndex);
});

test('project identity uses a three-letter badge and keeps the badge color configurable', async () => {
  const helper = await read('src/shared/helpers/projectTrigram.ts');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const projects = await read('src/Containers/Projects/Projects.container.tsx');

  assert.ok(helper.includes('export const getProjectTrigram'));
  assert.ok(navigation.includes('getProjectTrigram(project.name)'));
  assert.ok(tree.includes('getProjectTrigram(project.name)'));
  assert.ok(projects.includes('getProjectTrigram(project.name)'));
  assert.ok(projects.includes('{ color: projectColor }'));
  assert.doesNotMatch(projects, /Pictogramme/);
});

test('all-projects home reuses the Viewer workspace layout and shows four meaningful indicators', async () => {
  const projects = await read('src/Containers/Projects/Projects.container.tsx');
  const explorer = await read('src/Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel.tsx');

  assert.ok(projects.includes('variant="projects-overview"'));
  assert.ok(projects.includes('className="processViewerLayout processViewerWorkspace"'));
  assert.ok(projects.includes('className="processViewerResizeHandle"'));
  assert.ok(projects.includes('Projets accessibles'));
  assert.ok(projects.includes('Processus distincts'));
  assert.ok(projects.includes('Processus publiés'));
  assert.ok(projects.includes('Modifiés sur 30 jours'));
  assert.ok(explorer.includes("variant: 'process-details' | 'content-viewer' | 'projects-overview'"));
  assert.ok(explorer.includes('projects.map(project =>'));
});
