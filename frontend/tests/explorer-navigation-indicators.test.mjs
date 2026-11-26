import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const tree = read('../src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
const treeHook = read('../src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts');
const projectHook = read('../src/shared/hooks/useActiveProject.ts');
const projectController = read('../../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts');
const breadcrumbs = read('../src/Components/GenericComponents/Breadcrumbs/Breadcrumbs.tsx');
const layout = read('../src/Containers/BpmnLayout/BpmnLayout.container.tsx');

test('explorer distinguishes folders, common processes, variants and project-specific processes', () => {
  assert.match(tree, /FolderRounded sx=\{\{ color: '#c58a2b' \}\}/);
  assert.match(tree, /node\?\.usage === 'common'[\s\S]*?PublicOutlined/);
  assert.match(tree, /node\?\.usage === 'variant' && node\?\.sourceResourceId[\s\S]*?AltRoute/);
  assert.match(tree, /DescriptionOutlined sx=\{\{ color: getProcessStatusColor\(node\) \}\}/);
  assert.match(tree, /PublicOutlined sx=\{\{ color: getProcessStatusColor\(node\) \}\}/);
});

test('explorer displays change-request indicators separately from remark indicators', () => {
  assert.match(projectController, /changeRequestsCountByProjectResource/);
  assert.match(projectController, /changeRequestsCount:/);
  assert.match(projectHook, /changeRequestsCount\?: number/);
  assert.match(projectHook, /changeRequestStatus\?: 'submitted' \| 'in_progress' \| 'published'/);
  assert.match(treeHook, /changeRequestsCount: projectProcess\?\.changeRequestsCount \?\? 0/);
  assert.match(treeHook, /changeRequestStatus: projectProcess\?\.changeRequestStatus \?\? null/);
  assert.match(projectController, /ProcessChangeProposalStatus\.Submitted/);
  assert.match(projectController, /ProcessChangeProposalStatus\.ChangesRequested/);
  assert.match(projectController, /ProcessChangeProposalStatus\.Approved/);
  assert.match(projectController, /ProcessChangeProposalStatus\.Published/);
  assert.match(tree, /changeRequestStatus === 'submitted'[\s\S]*?return '#d32f2f'/);
  assert.match(tree, /changeRequestStatus === 'in_progress'[\s\S]*?return '#ed6c02'/);
  assert.match(tree, /changeRequestStatus === 'published'[\s\S]*?return '#2e7d32'/);
  assert.match(tree, /RateReviewOutlined/);
  assert.match(tree, /node\?\.changeRequestsCount/);
  assert.match(tree, /node\?\.remarksCount/);
});

test('projects navigation is available in the breadcrumb, not as a row under explorer search', () => {
  assert.match(breadcrumbs, /<Home \/>[\s\S]*?breadcrumbItem\.label/);
  assert.doesNotMatch(tree, /Tous les projets/);
});

test('folder creation actions are hidden inside a folder while root actions remain available', () => {
  assert.ok(layout.includes('if (!resource || resource.type === ResourceType.Folder) {'));
  assert.ok(layout.includes('return <></>'));
  assert.doesNotMatch(layout, /isRootFolder \|\| resource\?\.type === ResourceType\.Folder/);
  const folderGuard = layout.indexOf('if (!resource || resource.type === ResourceType.Folder) {');
  assert.ok(folderGuard >= 0 && layout.indexOf('return <></>', folderGuard) > folderGuard);
});

test('explorer uses distinct family colors and icons when process family metadata is present', () => {
  assert.match(treeHook, /family: item\.processMetadata\?\.family/);
  for (const [family, icon] of [['GOV', 'AccountBalanceOutlined'], ['HR', 'GroupsOutlined'], ['FIN', 'PaymentsOutlined'], ['IT', 'ComputerOutlined'], ['DEL', 'CodeOutlined'], ['MNT', 'BuildCircleOutlined']]) {
    assert.match(tree, new RegExp(`\\b${icon}\\b`), `missing ${family} icon`);
    assert.match(tree, new RegExp(`${family}: '#[0-9a-f]{6}'`), `missing ${family} color`);
  }
  assert.match(tree, /getProcessFamilyIcon\(node\)/);
});
