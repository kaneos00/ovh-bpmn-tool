import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('modeler save-and-publish navigates only after a successful draft save', async () => {
  const container = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const action = await read('src/Containers/ContentModeler/ContentModeler.action.ts');

  assert.ok(container.includes('if (actionData.error)'));
  assert.ok(container.includes("if (actionData.formAction === 'saveContent')"));
  assert.ok(container.includes('navigate('));
  assert.ok(!container.includes('<Navigate'));
  assert.ok(action.includes('await Promise.all(['));
  assert.ok(action.includes('getXmlContentQuery(resourceId, contentId)'));
});

test('failed publication stays on the confirmation screen for retry', async () => {
  const container = await read('src/Containers/PublishResource/PublishResource.container.tsx');

  assert.match(container, /actionData && !actionData.error/);
  assert.match(container, /failed publication must remain on the confirmation screen/);
});

test('proposal review opens and saves the exact submitted draft instead of failing silently', async () => {
  const hook = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');
  const queue = await read('src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx');

  assert.ok(hook.includes('const editableContent = proposalId && selectedContent?.status === ContentStatusEnum.Draft'));
  assert.ok(hook.includes('Aucun brouillon modifiable n’a été chargé'));
  assert.ok(hook.includes("saveDiagram('saveContent', editableContent)"));
  assert.ok(hook.includes("saveDiagram(\n        proposalId ? 'saveContentBeforeSubmit' : 'saveContentBeforePublish',\n        editableContent,"));
  assert.ok(hook.includes('Le modeleur n’a retourné aucun XML à enregistrer.'));
  assert.ok(queue.includes('&contentId=${proposal.submittedContentId}'));
});

test('viewer remark submission uses a project that grants the member remark permission', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.ok(viewer.includes('const { projects, activeProject } = useActiveProject();'));
  assert.ok(viewer.includes('project => project.id === activeProject?.id'));
  assert.ok(viewer.includes('projectsForProcess.length === 1 ? projectsForProcess[0] : undefined'));
  assert.ok(viewer.includes('const projectForRemark = projectForProcess?.canSubmitRemarks'));
  assert.ok(viewer.includes('${projectForRemark.id}/processes/${resourceId}/change-proposals'));
  assert.ok(viewer.includes('Votre remarque a été déposée et transmise au circuit de validation du projet.'));
  const initialRemarkFlow = viewer.slice(
    viewer.indexOf('const startInitialRemark'),
    viewer.indexOf('const processWorkspaceRef'),
  );
  assert.ok(!initialRemarkFlow.includes('navigate('));
});

test('published viewer loads active proposal remarks and displays per-element counters', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.ok(details.includes('/change-proposals/active?contentId='));
  assert.ok(details.includes('/projects/process-change-proposals/'));
  assert.ok(details.includes("queryKey: ['process-change-proposal-comments']"));
  assert.ok(details.includes('remarks={viewerRemarks}'));
  assert.ok(viewer.includes('remarks?: ProcessViewerRemark[]'));
  assert.ok(hook.includes("viewer.get('overlays')"));
  assert.ok(hook.includes('pending > 0 ?'));
  assert.ok(hook.includes('onElementSelectRef.current?.(elementId)'));
});
