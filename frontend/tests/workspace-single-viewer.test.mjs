import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('the project workspace is the only project landing page and Viewer shell', async () => {
  const routes = await read('src/routes.tsx');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const redirect = await read('src/Containers/ProjectWorkspaceRedirect/index.tsx');
  const overview = await read('src/Containers/BpmnLayout/FolderOverview.tsx');

  assert.match(routes, /path: '\/'\s*,\s*loader: \(\) => redirect\('\/root'\)/);
  assert.match(routes, /path: '\/home'\s*,\s*loader: \(\) => redirect\('\/root'\)/);
  assert.match(routes, /path: '\/projects\/:projectId\/viewer'[\s\S]*?import\('\.\/Containers\/ProjectWorkspaceRedirect'\)/);
  assert.doesNotMatch(routes, /import\('\.\/Containers\/Home'\)/);
  assert.doesNotMatch(routes, /import\('\.\/Containers\/ProjectViewer'\)/);

  assert.doesNotMatch(navigation, /label: 'Accueil'|label: 'Projets'/);
  assert.match(navigation, /globalRole === 'admin'[\s\S]*?>\s*Administration\s*<\/Button>/);
  assert.ok(navigation.includes('<UserAccountMenu />'), 'account menu remains available');
  assert.doesNotMatch(navigation, /label: 'Référentiel'/);
  assert.match(redirect, /setActiveProject\(projectId\)/);
  assert.match(redirect, /navigate\('\/root', \{ replace: true \}\)/);

  assert.match(overview, /ProjectProcessOverview/);
  assert.match(overview, /useQuery\(resourcesQuery\(\)\)/);
  assert.doesNotMatch(overview, /explorerQuery/);
  assert.match(overview, /apiClient\.put\(`\/projects\/\$\{activeProjectId\}`/);
});

test('project breadcrumbs omit the redundant Referentiel level and Home landing page', async () => {
  const breadcrumbs = await read('src/Containers/BpmnLayout/hooks/useBpmnLayoutBreadcrumbs.ts');

  assert.doesNotMatch(breadcrumbs, /label: 'Référentiel'/);
  assert.doesNotMatch(breadcrumbs, /to: '\/home'/);
  assert.match(breadcrumbs, /label: activeProject\.name/);
  assert.match(breadcrumbs, /treePath\.filter\(node => node\.id !== 'root'\)/);
});

test('legacy content viewer deep links redirect to the canonical viewer with snapshot context', async () => {
  const routes = await read('src/routes.tsx');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(routes, /path: '\/:resourceId\/viewer\/:contentId'/);
  assert.match(routes, /url\.searchParams\.set\('contentId', params\.contentId \?\? ''\)/);
  assert.match(routes, /return redirect\(`\/\$\{params\.resourceId\}\?\$\{url\.searchParams\.toString\(\)\}`\)/);
  assert.doesNotMatch(routes, /import\('\.\/Containers\/ContentViewer'\)/);
  assert.match(layout, /<ProcessDetails[\s\S]*?selectedContentId=\{requestedContentId\}/);
  assert.match(details, /contents\.find\(content => content\.id === selectedContentId\)/);
});

test('organization administration accepts only declared sections and returns 404 for unknown ones', async () => {
  const routes = await read('src/routes.tsx');

  assert.match(routes, /const organizationSections = new Set\(\['overview', 'projects', 'processes', 'governance'\]\)/);
  assert.match(routes, /async function requireOrganizationSection\([\s\S]*?await requireGlobalAdmin\(args\)/);
  assert.match(routes, /throw new Response\('Page d’administration introuvable', \{ status: 404 \}\)/);
  assert.match(routes, /path: '\/organization\/:section',[\s\S]*?loader: requireOrganizationSection/);
  assert.match(routes, /path: '\/organization\/users',[\s\S]*?lazy: \(\) => import\('\.\/Containers\/UserAccounts'\)/);
});

test('organization user administration has one canonical directory with project-role filtering and export', async () => {
  const routes = await read('src/routes.tsx');
  const users = await read('src/Containers/UserAccounts/index.tsx');

  assert.match(routes, /path: '\/organization\/users',[\s\S]*?import\('\.\/Containers\/UserAccounts'\)/);
  assert.match(routes, /async function redirectLegacyAccounts[\s\S]*?redirect\(\`\/organization\/users\$\{url\.search\}\`\)/);
  assert.match(routes, /path: '\/organization\/accounts',[\s\S]*?loader: redirectLegacyAccounts/);
  assert.doesNotMatch(routes, /path: '\/organization\/accounts',[\s\S]*?lazy: \(\) => import\('\.\/Containers\/UserAccounts'\)/);

  assert.match(users, /const \[projectRoleFilter, setProjectRoleFilter\] = useState/);
  assert.match(users, /project\.role === projectRoleFilter/);
  assert.match(users, /<FormLabel>Rôle projet<\/FormLabel>/);
  assert.match(users, /exportCsv\('utilisateurs-khi-flows\.csv'/);
  assert.match(users, /project\.canSubmitRemarks \? 'Oui' : 'Non'/);
});

test('organization user management exists only in the canonical user directory', async () => {
  const routes = await read('src/routes.tsx');
  const administration = await read('src/Containers/OrganizationAdmin/OrganizationAdmin.container.tsx');
  const users = await read('src/Containers/UserAccounts/index.tsx');

  assert.match(routes, /path: '\/organization\/users',[\s\S]*?lazy: \(\) => import\('\.\/Containers\/UserAccounts'\)/);
  assert.doesNotMatch(administration, /{ key: 'users', label: 'Utilisateurs'/);
  assert.doesNotMatch(administration, /activeSection === 'users'|setMembership|removeMembership|userRoleFilter|userProjectFilter|org-add-access/);
  assert.match(users, /updateProjectAccess/);
  assert.match(users, /updateProjectRemarkPermission/);
  assert.match(users, /removeProjectAccess/);
});

test('workspace and organization administration avoid duplicate repository and admin entry points', async () => {
  const projects = await read('src/Containers/Projects/Projects.container.tsx');
  const administration = await read('src/Containers/OrganizationAdmin/OrganizationAdmin.container.tsx');
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');

  assert.doesNotMatch(projects, /Administration de l’organisation/);
  assert.doesNotMatch(administration, /org-admin-v2__repository-link/);
  assert.match(navigation, /navigate\('\/organization\/overview'\)/);
  assert.match(navigation, />\s*Administration\s*<\/Button>/);
});

test('all organization administration screens share one shell and navigation', async () => {
  const layout = await read('src/Containers/OrganizationAdmin/OrganizationAdminLayout.tsx');
  const administration = await read('src/Containers/OrganizationAdmin/OrganizationAdmin.container.tsx');
  const users = await read('src/Containers/UserAccounts/index.tsx');

  for (const section of ['overview', 'users', 'projects', 'processes', 'governance']) {
    assert.match(layout, new RegExp(`key: '${section}'`));
  }
  assert.match(layout, /aria-current=\{activeSection === item\.key \? 'page' : undefined\}/);
  assert.match(layout, /<Breadcrumbs breadcrumbItems=\{breadcrumbs\} \/>/);
  assert.match(administration, /<OrganizationAdminLayout[\s\S]*?activeSection=\{activeSection\}/);
  assert.match(users, /<OrganizationAdminLayout[\s\S]*?activeSection="users"/);
  assert.doesNotMatch(users, /org-admin-v2__sidebar|Navigation de l’administration/);
  assert.match(users, /id: 'account', label: selectedAccount\?\.username/);
});

test('organization administration routes and APIs keep global administrator authorization', async () => {
  const routes = await read('src/routes.tsx');
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts');
  const auth = await read('../backend/src/auth/auth.controller.ts');

  assert.match(routes, /path: '\/organization\/users',[\s\S]*?loader: requireGlobalAdmin/);
  assert.match(routes, /path: '\/organization\/users\/:username',[\s\S]*?loader: requireGlobalAdmin/);
  assert.match(routes, /path: '\/organization\/:section',[\s\S]*?loader: requireOrganizationSection/);
  assert.match(controller, /@Get\('administration\/overview'\)[\s\S]*?@UseAcl\(\[UserGroup\.Admin\]\)/);
  assert.match(controller, /@Put\('administration\/projects\/:projectId\/members\/:userId'\)[\s\S]*?@UseAcl\(\[UserGroup\.Admin\]\)/);
  assert.match(controller, /@Delete\('administration\/projects\/:projectId\/members\/:userId'\)[\s\S]*?@UseAcl\(\[UserGroup\.Admin\]\)/);
  assert.match(controller, /@Get\('\:projectId'\)[\s\S]*?assertProjectReadRole\(projectId, headers\)/);
  assert.match(controller, /@Put\('\:projectId'\)[\s\S]*?assertProjectRole\(projectId, headers, ProjectMemberRole\.Admin\)/);
  assert.match(auth, /@Get\('users'\)[\s\S]*?await this\.requireAdmin\(request\)/);
  assert.match(auth, /@Post\('users'\)[\s\S]*?await this\.requireAdmin\(request\)/);
});

test('organization-wide search is explicit and project scope remains the default when a project is active', async () => {
  const search = await read('src/Containers/SearchResults/SearchResults.container.tsx');
  const users = await read('src/Containers/UserAccounts/index.tsx');

  assert.match(search, /useState<'project' \| 'organization'>/);
  assert.match(search, /projectId: effectiveProjectId/);
  assert.match(search, /scope === 'organization' \|\| Boolean\(activeProjectId\)/);
  assert.match(search, /Toute l’organisation/);
  assert.match(search, /scope === 'project' \? activeProjectId/);
  assert.match(search, /filter\(process => scope === 'organization' \|\| projectProcessIds\.has\(process\.id\)\)/);
  assert.match(users, /const \[projectFilter, setProjectFilter\] = useState\('all'\)/);
  assert.match(users, /project\.projectId === projectFilter/);
  assert.match(users, /<FormLabel>Projet<\/FormLabel>/);
});


test('proposal workspaces remain authorized resources but are excluded from the ordinary project explorer', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts');

  assert.match(controller, /const visibleLinks = links\.filter\([\s\S]*?!resourceById\.get\(link\.resourceId\)\?\.sourceResourceId/);
  assert.match(controller, /for \(const link of visibleLinks\)/);
  assert.match(controller, /projectProcesses\.create\([\s\S]*?resourceId: variant\.id[\s\S]*?sourceResourceId: source\.id/);
});

test('a newly created process variant starts with a published copy of its source BPMN', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts');
  const variantHandler = controller.slice(controller.indexOf("@Post(':projectId/processes/variants')"));

  assert.match(variantHandler, /content: sourceContent\.content/);
  assert.match(variantHandler, /pngContent: sourceContent\.pngContent/);
  assert.match(variantHandler, /status: ContentStatusEnum\.Published/);
  assert.match(variantHandler, /version: 1/);
});

test('quick search uses the same unified backend search as the results page', async () => {
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');
  const results = await read('src/Containers/SearchResults/SearchResults.container.tsx');

  assert.match(navigation, /unifiedSearchQuery/);
  assert.match(navigation, /searchOptions\.queryKey/);
  assert.match(navigation, /searchOptions\.queryFn/);
  assert.match(navigation, /searchError/);
  assert.match(navigation, /error: deepSearchError/);
  assert.match(navigation, /retryDeepSearch/);
  assert.match(navigation, /onClick=\{\(\) => void retryDeepSearch\(\)\}/);
  assert.match(navigation, /const \[debouncedSearch, setDebouncedSearch\] = useState\(''\)/);
  assert.match(navigation, /setTimeout\(\(\) => setDebouncedSearch\(search\.trim\(\)\), 250\)/);
  assert.match(navigation, /q: debouncedSearch/);
  assert.match(navigation, /keepPreviousData: true/);
  assert.match(navigation, /resourcesQuery\(\)/);
  assert.match(navigation, /resource\.type === ResourceType\.Folder/);
  assert.doesNotMatch(navigation, /contentsQuery|getXmlContentQuery|deriveRaciMatrixFromXml/);
  assert.match(results, /unifiedSearchQuery/);
});

test('legacy project variants remain visible until their first published version', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /process\.usage === 'variant'/);
  assert.match(details, /if \(!viewerContent && isProjectVariant\)/);
  assert.match(details, /isUnpublishedVariantDraft/);
  assert.match(details, /canSubmitProcessRemark = Boolean\(projectForRemark\?\.canSubmitRemarks && publishedContent\)/);
});

test('proposal modeler resolves the canonical clone workspace and source return route', async () => {
  const container = await read('src/Containers/ContentModeler/ContentModeler.container.tsx');
  const hook = await read('src/Containers/ContentModeler/hooks/useContentModeler.ts');

  assert.match(container, /projects\/me\/process-change-proposals/);
  assert.match(container, /projects\/me\/process-change-proposals\/to-review/);
  assert.match(container, /proposalContext\?\.cloneResourceId/);
  assert.match(container, /proposalWorkspaceResolved/);
  assert.match(container, /proposalResourceReady = !proposalId \|\| Boolean\(proposalContext\?\.cloneResourceId\)/);
  assert.match(container, /useContentModeler\(bpmnModelerInstance, resolvedResourceId, proposalResourceReady\)/);
  assert.match(container, /params\.set\('sourceResourceId', proposalContext\.sourceResourceId\)/);
  assert.match(container, /proposalContext\.cloneResourceId/);
  assert.match(hook, /resourceIdOverride\?: string/);
  assert.match(hook, /resourceIdOverride \?\? routeResourceId/);
});

test('open proposal notices and remarks are scoped to the exact project process version', async () => {
  const controller = await read('../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(controller, /projectId: proposal\.projectId,[\s\S]*?sourceResourceId: proposal\.sourceResourceId,[\s\S]*?sourcePublishedContentId: proposal\.sourcePublishedContentId/);
  assert.match(controller, /ProcessChangeProposalStatus\.Submitted,[\s\S]*?ProcessChangeProposalStatus\.Approved/);
  assert.match(controller, /proposal\.submittedContentId/);
  assert.match(controller, /cloneContentId: null/);
  assert.match(controller, /must never be resumable/);
  assert.match(details, /activeProposal\.projectId === projectForProcess\?\.id/);
  assert.match(details, /process-change-proposal-comments/);
  assert.match(details, /remark\.comment \|\| 'Texte de remarque indisponible\.'/);
  assert.match(details, /activeProposal\.sourceResourceId === resourceId/);
  assert.match(details, /activeProposal\.sourcePublishedContentId === viewerContent\?\.id/);
  assert.match(details, /currentActiveProposal\?\.id/);
  assert.match(details, /isFetching: activeProposalFetching/);
  assert.match(details, /const currentActiveProposal = !activeProposalFetching && !activeProposalError && activeProposal/);
  assert.match(details, /currentActiveProposal && !activeProposalFetching && !activeProposalError && !isHistoricalView/);
  assert.match(details, /activeProposalFetching \|\| isHistoricalView/);
  assert.match(details, /navigate\('\/mes-demandes'\)/);
  assert.match(details, /Consulter le suivi de la demande/);
});


test('the modeler export menu is reset when navigating to another process', async () => {
  const actionBar = await read('src/Containers/ContentModeler/components/ModelerActionBar.tsx');

  assert.ok(actionBar.includes('<Dropdown key={`export-menu:${resourceId}`}>'));
});
