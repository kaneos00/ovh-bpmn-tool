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
  assert.match(tree, /node\?\.usage === 'variant'[\s\S]*?AltRoute/);
  assert.match(tree, /DescriptionOutlined sx=\{\{ color: '#3975c6' \}\}/);
});

test('explorer displays change-request indicators separately from remark indicators', () => {
  assert.match(projectController, /changeRequestsCountByProjectResource/);
  assert.match(projectController, /changeRequestsCount:/);
  assert.match(projectHook, /changeRequestsCount\?: number/);
  assert.match(treeHook, /changeRequestsCount: projectProcess\?\.changeRequestsCount \?\? 0/);
  assert.match(tree, /RateReviewOutlined/);
  assert.match(tree, /node\?\.changeRequestsCount/);
  assert.match(tree, /node\?\.remarksCount/);
});

test('projects navigation is available in the breadcrumb, not as a row under explorer search', () => {
  assert.match(breadcrumbs, /<Home \/>[\s\S]*?breadcrumbItem\.label/);
  assert.doesNotMatch(tree, /Tous les projets/);
});

test('folder creation actions are hidden inside a folder while root actions remain available', () => {
  assert.match(layout, /if \(isRootFolder\) \{[\s\S]*?<FolderActions/);
  assert.doesNotMatch(layout, /isRootFolder \|\| resource\?\.type === ResourceType\.Folder/);
});
