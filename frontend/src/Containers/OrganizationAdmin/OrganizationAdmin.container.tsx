import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import './OrganizationAdmin.scss';

type MembershipView = {
  projectId: string;
  projectName: string;
  role: 'viewer' | 'modeler' | 'admin';
};

type AdminUser = {
  userId: string;
  projects: MembershipView[];
};

type MembershipChange = {
  projectId: string;
  userId: string;
  role: MembershipView['role'];
};

type MembershipRemoval = {
  projectId: string;
  userId: string;
};

type ProjectCreate = { name: string; description: string };
type ProjectUpdate = { id: string; name: string; description: string };
type ProjectRemoval = { id: string };

type AdminProcessLink = {
  projectId: string;
  projectName: string;
  usage: 'common' | 'variant' | 'project-specific';
  sourceResourceId: string | null;
};

type AdminProject = {
  id: string;
  name: string;
  description: string | null;
  membersCount: number;
  processes: Array<{
    resourceId: string;
    name: string;
    usage: AdminProcessLink['usage'];
    sourceResourceId: string | null;
  }>;
};

type AdminProcess = {
  id: string;
  name: string;
  description: string | null;
  projects: AdminProcessLink[];
};

type AdministrationOverview = {
  projects: AdminProject[];
  users: AdminUser[];
  processes: AdminProcess[];
};

const queryKey = ['organization-administration-overview'];
const sections = [
  { key: 'overview', label: 'Vue d’ensemble', icon: '▦' },
  { key: 'users', label: 'Utilisateurs', icon: '♙' },
  { key: 'projects', label: 'Projets', icon: '▣' },
  { key: 'processes', label: 'Processus', icon: '⌘' },
  { key: 'governance', label: 'Acteurs et RACI', icon: '⬡' },
  { key: 'settings', label: 'Organisation', icon: '⚙' },
] as const;

type AdminSection = (typeof sections)[number]['key'];

const roleLabel: Record<MembershipView['role'], string> = {
  viewer: 'Viewer',
  modeler: 'Modeler',
  admin: 'Admin',
};

const usageLabel: Record<AdminProcessLink['usage'], string> = {
  common: 'Commun',
  variant: 'Variante',
  'project-specific': 'Spécifique au projet',
};

const roleColor: Record<MembershipView['role'], 'warning' | 'primary' | 'neutral'> = {
  admin: 'warning',
  modeler: 'primary',
  viewer: 'neutral',
};

const searchPlaceholders: Partial<Record<AdminSection, string>> = {
  users: 'Rechercher un identifiant, un projet ou un rôle…',
  projects: 'Rechercher un projet ou un processus…',
  processes: 'Rechercher un processus ou un projet utilisateur…',
};

const usageColor: Record<AdminProcessLink['usage'], 'success' | 'primary' | 'warning'> = {
  common: 'success',
  variant: 'warning',
  'project-specific': 'primary',
};

const exportCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const Component = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | MembershipView['role']>('all');
  const [userProjectFilter, setUserProjectFilter] = useState('all');
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'shared' | 'specific' | 'variant'>('all');
  const [processUsageFilter, setProcessUsageFilter] = useState<'all' | AdminProcessLink['usage']>('all');
  const [processProjectFilter, setProcessProjectFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, MembershipView['role']>>({});
  const [newUserId, setNewUserId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newRole, setNewRole] = useState<MembershipView['role']>('viewer');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const section = location.pathname.split('/').filter(Boolean)[1] ?? 'users';
  const activeSection: AdminSection = sections.some((item) => item.key === section)
    ? (section as AdminSection)
    : 'users';

  const overviewQuery = useQuery<AdministrationOverview>(
    queryKey,
    () => apiClient.get('/projects/administration/overview'),
  );

  const setMembership = useMutation(
    (change: MembershipChange) =>
      apiClient.put(
        `/projects/administration/projects/${change.projectId}/members/${encodeURIComponent(change.userId)}`,
        { role: change.role },
      ),
    {
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const removeMembership = useMutation(
    (membership: MembershipRemoval) =>
      apiClient.remove(
        `/projects/administration/projects/${membership.projectId}/members/${encodeURIComponent(membership.userId)}`,
      ),
    {
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const createProject = useMutation(
    (project: ProjectCreate) => apiClient.post('/projects', project),
    {
      onSuccess: async () => {
        setActionError(null);
        setNewProjectName('');
        setNewProjectDescription('');
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const updateProject = useMutation(
    (project: ProjectUpdate) =>
      apiClient.put(`/projects/administration/projects/${project.id}`, {
        name: project.name,
        description: project.description,
      }),
    {
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const deleteProject = useMutation(
    (project: ProjectRemoval) =>
      apiClient.remove(`/projects/administration/projects/${project.id}`),
    {
      onSuccess: async () => {
        setActionError(null);
        setSelectedProjectId(null);
        setConfirmProjectDelete(false);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const overview = overviewQuery.data;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const users = useMemo(
    () => (overview?.users ?? []).filter((user) =>
      (!normalizedSearch ||
        user.userId.toLocaleLowerCase().includes(normalizedSearch) ||
        user.projects.some((project) =>
          project.projectName.toLocaleLowerCase().includes(normalizedSearch) ||
          project.role.toLocaleLowerCase().includes(normalizedSearch),
        )) &&
      (userRoleFilter === 'all' || user.projects.some((project) => project.role === userRoleFilter)) &&
      (userProjectFilter === 'all' || user.projects.some((project) => project.projectId === userProjectFilter)),
    ),
    [overview?.users, normalizedSearch, userRoleFilter, userProjectFilter],
  );
  const projects = useMemo(
    () => (overview?.projects ?? []).filter((project) =>
      (!normalizedSearch ||
        project.name.toLocaleLowerCase().includes(normalizedSearch) ||
        (project.description ?? '').toLocaleLowerCase().includes(normalizedSearch) ||
        project.processes.some((process) => process.name.toLocaleLowerCase().includes(normalizedSearch))) &&
      (projectTypeFilter === 'all' ||
        (projectTypeFilter === 'shared' && project.processes.some((process) => process.usage === 'common')) ||
        (projectTypeFilter === 'specific' && project.processes.length > 0 && !project.processes.some((process) => process.usage === 'common')) ||
        (projectTypeFilter === 'variant' && project.processes.some((process) => process.usage === 'variant'))),
    ),
    [overview?.projects, normalizedSearch, projectTypeFilter],
  );
  const processes = useMemo(
    () => (overview?.processes ?? []).filter((process) =>
      (!normalizedSearch ||
        process.name.toLocaleLowerCase().includes(normalizedSearch) ||
        (process.description ?? '').toLocaleLowerCase().includes(normalizedSearch) ||
        process.projects.some((project) =>
          project.projectName.toLocaleLowerCase().includes(normalizedSearch) ||
          usageLabel[project.usage].toLocaleLowerCase().includes(normalizedSearch),
        )) &&
      (processUsageFilter === 'all' || process.projects.some((project) => project.usage === processUsageFilter)) &&
      (processProjectFilter === 'all' || process.projects.some((project) => project.projectId === processProjectFilter)),
    ),
    [overview?.processes, normalizedSearch, processUsageFilter, processProjectFilter],
  );

  const selectedUser = users.find((user) => user.userId === selectedUserId);
  const selectedProject = overview?.projects.find((project) => project.id === selectedProjectId);
  const selectedProcess = overview?.processes.find((process) => process.id === selectedProcessId);

  const title = sections.find((item) => item.key === activeSection)?.label ?? 'Vue d’ensemble';
  const isDataSection = activeSection === 'users' || activeSection === 'projects' || activeSection === 'processes';
  const associationCount = (overview?.projects ?? []).reduce((total, project) => total + project.processes.length, 0);
  const projectsWithoutCommonProcess = (overview?.projects ?? []).filter(
    (project) => project.processes.length > 0 && !project.processes.some((process) => process.usage === 'common'),
  );
  const sharedProcessCount = (overview?.processes ?? []).filter(
    (process) => new Set(process.projects.map((project) => project.projectId)).size > 1,
  ).length;

  return (
    <Sheet className="org-admin-v2__page" sx={{ width: '100%', maxWidth: 1440, boxSizing: 'border-box', mx: 'auto', p: { xs: 1, md: 2 }, bgcolor: 'transparent' }}>
      <Stack spacing={2}>
        <WorkspaceNavigation />
        <div className="org-admin-v2">
          <aside className="org-admin-v2__sidebar">
            <div className="org-admin-v2__brand">
              <div className="org-admin-v2__brand-mark">K</div>
              <div><strong>KHI Flows</strong><small>Organisation</small></div>
            </div>
            <div className="org-admin-v2__nav-group">
              <div className="org-admin-v2__nav-label">Administration</div>
              <nav className="org-admin-v2__nav" aria-label="Navigation de l’administration">
                {sections.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={`org-admin-v2__nav-item${activeSection === item.key ? ' is-active' : ''}`}
                    aria-current={activeSection === item.key ? 'page' : undefined}
                    onClick={() => {
                      setSearch('');
                      setSelectedUserId(null);
                      setSelectedProjectId(null);
                      setSelectedProcessId(null);
                      navigate(`/organization/${item.key}`);
                    }}
                  >
                    <span className="org-admin-v2__nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="org-admin-v2__sidebar-foot">
              <strong>Accès sécurisés</strong>
              <span>Les droits sont contrôlés par l’API, indépendamment de l’interface.</span>
            </div>
          </aside>
          <main className="org-admin-v2__main">
            <header className="org-admin-v2__topbar">
              <div><div className="org-admin-v2__crumb">Administration / {title}</div><div className="org-admin-v2__top-title">Administration de l’organisation</div></div>
              <Chip size="sm" color="primary" variant="soft">Accès organisationnel</Chip>
            </header>
            <div className="org-admin-v2__content">
              {activeSection === 'overview' && overview && (
                <section aria-labelledby="org-overview-title">
                  <div className="org-admin-v2__page-head">
                    <div><div className="org-admin-v2__eyebrow">Pilotage</div><Typography id="org-overview-title" level="h1">Vue d’ensemble</Typography><Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 700, mt: 0.5 }}>Un point d’entrée unique pour administrer les utilisateurs, les projets et le référentiel des processus de l’organisation.</Typography></div>
                    <div className="org-admin-v2__actions"><Button variant="outlined" onClick={() => navigate('/organization/processes')}>Explorer les processus</Button><Button onClick={() => navigate('/organization/projects')}>Voir les projets</Button></div>
                  </div>
                  <div className="org-admin-v2__stats">
                    <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Utilisateurs avec accès</span><span className="org-admin-v2__stat-icon">♙</span></div><div className="org-admin-v2__stat-value">{overview.users.length}</div><div className="org-admin-v2__stat-note">Comptes connus par leurs adhésions</div></Card>
                    <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Projets</span><span className="org-admin-v2__stat-icon">▣</span></div><div className="org-admin-v2__stat-value">{overview.projects.length}</div><div className="org-admin-v2__stat-note">Projets visibles par l’administration</div></Card>
                    <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Processus référencés</span><span className="org-admin-v2__stat-icon">⌘</span></div><div className="org-admin-v2__stat-value">{overview.processes.length}</div><div className="org-admin-v2__stat-note">Catalogue transversal BPMN</div></Card>
                    <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Associations projet-processus</span><span className="org-admin-v2__stat-icon">↗</span></div><div className="org-admin-v2__stat-value">{associationCount}</div><div className="org-admin-v2__stat-note">Commun, spécifique et variantes</div></Card>
                  </div>
                  <div className="org-admin-v2__dashboard-grid">
                    <Card className="org-admin-v2__panel">
                      <div className="org-admin-v2__panel-head"><Typography level="title-lg">Accès rapides</Typography><Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Navigation transversale</Typography></div>
                      <div className="org-admin-v2__quicklinks">
                        <button type="button" className="org-admin-v2__quicklink" onClick={() => navigate('/organization/users')}><span className="org-admin-v2__quick-icon">♙</span><span><strong>Gérer les utilisateurs</strong><small>Rôles et projets accessibles par personne</small></span><span className="org-admin-v2__arrow">→</span></button>
                        <button type="button" className="org-admin-v2__quicklink" onClick={() => navigate('/organization/projects')}><span className="org-admin-v2__quick-icon">▣</span><span><strong>Gérer les projets</strong><small>Membres, processus et responsabilités</small></span><span className="org-admin-v2__arrow">→</span></button>
                        <button type="button" className="org-admin-v2__quicklink" onClick={() => navigate('/organization/processes')}><span className="org-admin-v2__quick-icon">⌘</span><span><strong>Explorer le catalogue</strong><small>Processus communs, spécifiques et variantes</small></span><span className="org-admin-v2__arrow">→</span></button>
                        <button type="button" className="org-admin-v2__quicklink" onClick={() => navigate('/organization/governance')}><span className="org-admin-v2__quick-icon">⬡</span><span><strong>Consulter les responsabilités</strong><small>Accès aux RACI de chaque projet</small></span><span className="org-admin-v2__arrow">→</span></button>
                      </div>
                    </Card>
                    <Card className="org-admin-v2__panel">
                      <div className="org-admin-v2__panel-head"><Typography level="title-lg">Points de vigilance</Typography><Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Calculés sur les données réelles</Typography></div>
                      <div className="org-admin-v2__activity-list">
                        <div className="org-admin-v2__activity-row"><span className="org-admin-v2__activity-icon">!</span><div><strong>{projectsWithoutCommonProcess.length} projet(s) sans processus commun</strong><small>Vérifier si ces projets doivent réutiliser le référentiel organisationnel.</small><button type="button" className="org-admin-v2__link-button" onClick={() => navigate('/organization/projects')}>Consulter les projets →</button></div></div>
                        <div className="org-admin-v2__activity-row"><span className="org-admin-v2__activity-icon">↗</span><div><strong>{sharedProcessCount} processus partagé(s)</strong><small>Une référence commune peut être utilisée par plusieurs projets.</small><button type="button" className="org-admin-v2__link-button" onClick={() => navigate('/organization/processes')}>Ouvrir le catalogue →</button></div></div>
                        <div className="org-admin-v2__activity-row"><span className="org-admin-v2__activity-icon">⬡</span><div><strong>Gouvernance projet</strong><small>Les matrices RACI détaillées sont maintenues dans chaque projet.</small><button type="button" className="org-admin-v2__link-button" onClick={() => navigate('/organization/governance')}>Voir les projets →</button></div></div>
                      </div>
                    </Card>
                  </div>
                  <Alert color="neutral" variant="soft" sx={{ mt: 2 }}>La liste des utilisateurs est issue des adhésions existantes. Les comptes sans projet ne peuvent être recensés qu’après raccordement à un annuaire d’identité global.</Alert>
                </section>
              )}

              {isDataSection && (
                <section aria-labelledby="org-section-title">
                  <div className="org-admin-v2__page-head">
                    <div><div className="org-admin-v2__eyebrow">{activeSection === 'users' ? 'Administration des accès' : activeSection === 'projects' ? 'Portefeuille' : 'Référentiel transversal'}</div><Typography id="org-section-title" level="h1">{title}</Typography><Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 700, mt: 0.5 }}>{activeSection === 'users' ? 'Vue globale des utilisateurs et des projets auxquels ils ont accès.' : activeSection === 'projects' ? 'Chaque projet réunit ses membres, ses processus spécifiques et ses références au catalogue organisationnel.' : 'Retrouvez chaque processus et comprenez quels projets l’utilisent.'}</Typography></div>
                    <div className="org-admin-v2__actions">
                      {activeSection === 'users' && <><Button variant="outlined" onClick={() => exportCsv('utilisateurs-khi-flows.csv', [['Identifiant', 'Projet', 'Rôle'], ...(overview?.users ?? []).flatMap((user) => user.projects.map((project) => [user.userId, project.projectName, roleLabel[project.role]]))])}>Exporter la vue</Button><Button onClick={() => document.getElementById('org-add-access')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>＋ Ajouter un accès</Button></>}
                      {activeSection === 'projects' && <><Button variant="outlined" onClick={() => exportCsv('projets-khi-flows.csv', [['Projet', 'Description', 'Membres', 'Processus communs', 'Spécifiques', 'Variantes'], ...(overview?.projects ?? []).map((project) => [project.name, project.description ?? '', project.membersCount, project.processes.filter((process) => process.usage === 'common').length, project.processes.filter((process) => process.usage === 'project-specific').length, project.processes.filter((process) => process.usage === 'variant').length])])}>Exporter la vue</Button><Button onClick={() => document.getElementById('org-create-project')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>＋ Créer un projet</Button></>}
                      {activeSection === 'processes' && <><Button variant="outlined" onClick={() => exportCsv('processus-khi-flows.csv', [['Processus', 'Description', 'Projet', 'Usage', 'Source'], ...(overview?.processes ?? []).flatMap((process) => process.projects.length ? process.projects.map((project) => [process.name, process.description ?? '', project.projectName, usageLabel[project.usage], project.sourceResourceId ?? '']) : [[process.name, process.description ?? '', '', 'Non associé', '']])])}>Exporter la vue</Button><Button onClick={() => navigate('/root')}>＋ Nouveau processus</Button></>}
                    </div>
                  </div>
                  {activeSection === 'users' && <Alert color="neutral" variant="soft" sx={{ mb: 2 }}>Les rôles affichés sont des rôles de projet. Les identifiants proviennent des adhésions enregistrées ; les comptes sans adhésion ne sont pas encore fournis par un annuaire d’identité global.</Alert>}
                  <div className="org-admin-v2__filters">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholders[activeSection] ?? 'Rechercher…'} sx={{ flex: 1, minWidth: 220 }} />
                    {activeSection === 'users' && <>
                      <FormControl sx={{ minWidth: 180 }}><FormLabel>Rôle projet</FormLabel><Select value={userRoleFilter} onChange={(_event, value) => setUserRoleFilter((value ?? 'all') as typeof userRoleFilter)}><Option value="all">Tous les rôles</Option><Option value="admin">Admin</Option><Option value="modeler">Modeler</Option><Option value="viewer">Viewer</Option></Select></FormControl>
                      <FormControl sx={{ minWidth: 190 }}><FormLabel>Projet</FormLabel><Select value={userProjectFilter} onChange={(_event, value) => setUserProjectFilter(value ?? 'all')}><Option value="all">Tous les projets</Option>{(overview?.projects ?? []).map((project) => <Option key={project.id} value={project.id}>{project.name}</Option>)}</Select></FormControl>
                    </>}
                    {activeSection === 'projects' && <FormControl sx={{ minWidth: 220 }}><FormLabel>Type de projet</FormLabel><Select value={projectTypeFilter} onChange={(_event, value) => setProjectTypeFilter((value ?? 'all') as typeof projectTypeFilter)}><Option value="all">Tous les types</Option><Option value="shared">Utilise des processus communs</Option><Option value="specific">Processus spécifiques uniquement</Option><Option value="variant">Contient des variantes</Option></Select></FormControl>}
                    {activeSection === 'processes' && <>
                      <FormControl sx={{ minWidth: 190 }}><FormLabel>Type d’utilisation</FormLabel><Select value={processUsageFilter} onChange={(_event, value) => setProcessUsageFilter((value ?? 'all') as typeof processUsageFilter)}><Option value="all">Tous les types</Option><Option value="common">Catalogue commun</Option><Option value="project-specific">Spécifique au projet</Option><Option value="variant">Variante</Option></Select></FormControl>
                      <FormControl sx={{ minWidth: 190 }}><FormLabel>Projet utilisateur</FormLabel><Select value={processProjectFilter} onChange={(_event, value) => setProcessProjectFilter(value ?? 'all')}><Option value="all">Tous les projets</Option>{(overview?.projects ?? []).map((project) => <Option key={project.id} value={project.id}>{project.name}</Option>)}</Select></FormControl>
                    </>}
                  </div>
                </section>
              )}

              {activeSection === 'governance' && overview && (
                <section aria-labelledby="org-governance-title">
                  <div className="org-admin-v2__page-head"><div><div className="org-admin-v2__eyebrow">Responsabilités</div><Typography id="org-governance-title" level="h1">Acteurs et RACI</Typography><Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 700, mt: 0.5 }}>Retrouvez les projets et ouvrez directement leur gestion des responsabilités.</Typography></div></div>
                  <Alert color="neutral" variant="soft" sx={{ mb: 2 }}>Le RACI est géré au niveau du projet : cette vue transversale aide à retrouver le bon périmètre, tandis que les modifications restent soumises aux droits du projet.</Alert>
                  <div className="org-admin-v2__governance-list">{overview.projects.map((project) => <Card key={project.id} className="org-admin-v2__governance-card"><div className="org-admin-v2__governance-copy"><Typography level="title-lg">{project.name}</Typography>{project.description && <Typography level="body-sm" sx={{ color: 'text.secondary' }}>{project.description}</Typography>}<div className="org-admin-v2__governance-meta"><Chip size="sm" variant="soft">{project.membersCount} membre(s)</Chip><Chip size="sm" variant="soft">{project.processes.length} processus</Chip><Chip size="sm" variant="soft">RACI du projet</Chip></div></div><Button onClick={() => navigate(`/projects/${project.id}?tab=raci`)}>Gérer le RACI →</Button></Card>)}</div>
                  {overview.projects.length === 0 && <Card className="org-admin-v2__panel"><Typography level="title-md">Aucun projet accessible</Typography><Typography level="body-sm">Créez un projet ou attribuez un accès pour commencer à définir les responsabilités.</Typography></Card>}
                </section>
              )}

              {activeSection === 'settings' && (
                <section aria-labelledby="org-settings-title">
                  <div className="org-admin-v2__page-head"><div><div className="org-admin-v2__eyebrow">Configuration</div><Typography id="org-settings-title" level="h1">Organisation</Typography><Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 700, mt: 0.5 }}>Paramètres et gouvernance globale de l’instance.</Typography></div></div>
                  <div className="org-admin-v2__settings-grid">
                    <Card className="org-admin-v2__panel"><Typography level="title-lg">Administration organisationnelle</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Les droits globaux sont attribués par le groupe de confiance <code>bpmn-tool-admin-*</code>. Les rôles de projet viewer, modeler et admin ne confèrent aucun privilège global.</Typography><Chip color="success" variant="soft">Contrôle côté API</Chip></Card>
                    <Card className="org-admin-v2__panel"><Typography level="title-lg">Source des identités</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Cette instance utilise actuellement les identifiants transmis par le mécanisme d’authentification configuré. La découverte des comptes sans adhésion nécessite un annuaire global ou un fournisseur d’identité raccordé.</Typography><Chip color="warning" variant="soft">Annuaire global non raccordé</Chip></Card>
                    <Card className="org-admin-v2__panel"><Typography level="title-lg">Périmètre des données</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Les utilisateurs, projets et processus affichés proviennent de l’API d’administration. Les réglages non couverts par une API ne sont pas présentés comme modifiables.</Typography></Card>
                  </div>
                </section>
              )}

        {overviewQuery.isLoading && <Typography>Chargement des données d’administration…</Typography>}
        {overviewQuery.isError && (
          <Alert color="danger">
            Impossible de charger cette vue. Vérifiez que votre compte possède le groupe d’administration organisationnelle et que l’API V2 est à jour.
          </Alert>
        )}
        {actionError && <Alert color="danger">{actionError}</Alert>}

        {activeSection === 'users' && overview && (
          <Card id="org-add-access" variant="outlined" sx={{ gap: 1.5 }}>
            <Typography level="title-lg">Ajouter un accès à un projet</Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
              L’identifiant est celui utilisé par le proxy d’authentification. L’accès est créé uniquement pour le projet choisi.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'flex-end' } }}>
              <FormControl sx={{ flex: 1, minWidth: 200 }}>
                <FormLabel>Identifiant utilisateur</FormLabel>
                <Input value={newUserId} onChange={(event) => setNewUserId(event.target.value)} placeholder="Identifiant exact" />
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 200 }}>
                <FormLabel>Projet</FormLabel>
                <Select value={newProjectId || null} onChange={(_event, value) => setNewProjectId(value ?? '')} placeholder="Choisir un projet">
                  {overview.projects.map((project) => (
                    <Option key={project.id} value={project.id}>{project.name}</Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 170 }}>
                <FormLabel>Rôle projet</FormLabel>
                <Select value={newRole} onChange={(_event, value) => value && setNewRole(value as MembershipView['role'])}>
                  <Option value="viewer">Viewer — lecture</Option>
                  <Option value="modeler">Modeler — modification</Option>
                  <Option value="admin">Admin — gestion du projet</Option>
                </Select>
              </FormControl>
              <Button
                disabled={!newUserId.trim() || !newProjectId || setMembership.isLoading}
                loading={setMembership.isLoading}
                onClick={() => setMembership.mutate(
                  { projectId: newProjectId, userId: newUserId.trim(), role: newRole },
                  { onSuccess: () => { setNewUserId(''); setNewProjectId(''); } },
                )}
              >
                Ajouter l’accès
              </Button>
            </Stack>
          </Card>
        )}

        {activeSection === 'users' && selectedUser && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="title-lg">Accès de {selectedUser.userId}</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  Les modifications sont réservées au groupe d’administration organisationnelle.
                </Typography>
              </Box>
              <Button size="sm" variant="plain" color="neutral" onClick={() => setSelectedUserId(null)}>Fermer</Button>
            </Stack>
            {selectedUser.projects.map((project) => {
              const key = `${selectedUser.userId}:${project.projectId}`;
              const role = roleDrafts[key] ?? project.role;
              return (
                <Stack key={project.projectId} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography level="title-sm">{project.projectName}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Rôle actuel : {roleLabel[project.role]}</Typography>
                  </Box>
                  <FormControl sx={{ minWidth: 180 }}>
                    <FormLabel>Nouveau rôle</FormLabel>
                    <Select value={role} onChange={(_event, value) => value && setRoleDrafts((previous) => ({ ...previous, [key]: value as MembershipView['role'] }))}>
                      <Option value="viewer">Viewer — lecture</Option>
                      <Option value="modeler">Modeler — modification</Option>
                      <Option value="admin">Admin — gestion du projet</Option>
                    </Select>
                  </FormControl>
                  <Button
                    size="sm"
                    disabled={role === project.role || setMembership.isLoading}
                    loading={setMembership.isLoading}
                    onClick={() => setMembership.mutate({ projectId: project.projectId, userId: selectedUser.userId, role })}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined"
                    color="danger"
                    disabled={removeMembership.isLoading}
                    loading={removeMembership.isLoading}
                    onClick={() => removeMembership.mutate({ projectId: project.projectId, userId: selectedUser.userId })}
                  >
                    Retirer
                  </Button>
                </Stack>
              );
            })}
          </Card>
        )}

        {activeSection === 'users' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Identifiant utilisateur</th><th>Nombre de projets</th><th>Projets et rôles</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td><Typography level="title-sm">{user.userId}</Typography></td>
                    <td>{user.projects.length}</td>
                    <td>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {user.projects.map((project) => (
                          <Chip key={project.projectId} size="sm" variant="soft" color={roleColor[project.role]}>
                            {project.projectName} · {roleLabel[project.role]}
                          </Chip>
                        ))}
                      </Stack>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={() => setSelectedUserId(user.userId)}
                      >
                        Gérer les accès
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4}>Aucun utilisateur correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {activeSection === 'projects' && overview && (
          <Card id="org-create-project" variant="outlined" sx={{ gap: 1.5 }}>
            <Typography level="title-lg">Créer un projet</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'flex-end' } }}>
              <FormControl sx={{ flex: 1, minWidth: 220 }}>
                <FormLabel>Nom du projet</FormLabel>
                <Input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Nom du nouveau projet" />
              </FormControl>
              <FormControl sx={{ flex: 2, minWidth: 260 }}>
                <FormLabel>Description</FormLabel>
                <Input value={newProjectDescription} onChange={(event) => setNewProjectDescription(event.target.value)} placeholder="Description facultative" />
              </FormControl>
              <Button
                disabled={!newProjectName.trim() || createProject.isLoading}
                loading={createProject.isLoading}
                onClick={() => createProject.mutate({ name: newProjectName.trim(), description: newProjectDescription.trim() })}
              >
                Créer le projet
              </Button>
            </Stack>
          </Card>
        )}

        {activeSection === 'projects' && selectedProject && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="title-lg">Gérer {selectedProject.name}</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  {selectedProject.membersCount} membre(s) · {selectedProject.processes.length} processus associé(s)
                </Typography>
              </Box>
              <Button size="sm" variant="plain" color="neutral" onClick={() => setSelectedProjectId(null)}>Fermer</Button>
            </Stack>
            <FormControl>
              <FormLabel>Nom</FormLabel>
              <Input value={projectNameDraft} onChange={(event) => setProjectNameDraft(event.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input value={projectDescriptionDraft} onChange={(event) => setProjectDescriptionDraft(event.target.value)} />
            </FormControl>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                disabled={!projectNameDraft.trim() || updateProject.isLoading || (projectNameDraft === selectedProject.name && projectDescriptionDraft === (selectedProject.description ?? ''))}
                loading={updateProject.isLoading}
                onClick={() => updateProject.mutate({ id: selectedProject.id, name: projectNameDraft.trim(), description: projectDescriptionDraft.trim() })}
              >
                Enregistrer
              </Button>
              {selectedProject.processes.length === 0 && !confirmProjectDelete && (
                <Button
                  variant="outlined"
                  color="danger"
                  disabled={deleteProject.isLoading}
                  onClick={() => setConfirmProjectDelete(true)}
                >
                  Supprimer le projet
                </Button>
              )}
              {selectedProject.processes.length === 0 && confirmProjectDelete && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
                  <Typography level="body-sm" color="danger">Confirmer la suppression définitive de ce projet ?</Typography>
                  <Button
                    size="sm"
                    color="danger"
                    loading={deleteProject.isLoading}
                    disabled={deleteProject.isLoading}
                    onClick={() => deleteProject.mutate({ id: selectedProject.id })}
                  >
                    Confirmer
                  </Button>
                  <Button size="sm" variant="plain" color="neutral" onClick={() => setConfirmProjectDelete(false)}>
                    Annuler
                  </Button>
                </Stack>
              )}
              {selectedProject.processes.length > 0 && (
                <Typography level="body-xs" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                  Retirez d’abord les {selectedProject.processes.length} processus associés avant suppression.
                </Typography>
              )}
            </Stack>
          </Card>
        )}

        {activeSection === 'projects' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Projet</th><th>Description</th><th>Membres</th><th>Processus communs</th><th>Spécifiques</th><th>Variantes</th><th>Gestion</th></tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><Typography level="title-sm">{project.name}</Typography></td>
                    <td>{project.description || '—'}</td>
                    <td>{project.membersCount}</td>
                    <td>{project.processes.filter((process) => process.usage === 'common').length}</td>
                    <td>{project.processes.filter((process) => process.usage === 'project-specific').length}</td>
                    <td>{project.processes.filter((process) => process.usage === 'variant').length}</td>
                    <td><Button size="sm" variant="outlined" onClick={() => { setSelectedProjectId(project.id); setConfirmProjectDelete(false); setProjectNameDraft(project.name); setProjectDescriptionDraft(project.description ?? ''); }}>Gérer</Button></td>
                  </tr>
                ))}
                {projects.length === 0 && <tr><td colSpan={7}>Aucun projet correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {activeSection === 'processes' && selectedProcess && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="title-lg">{selectedProcess.name}</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  {selectedProcess.description || 'Aucune description'}
                </Typography>
              </Box>
              <Button size="sm" variant="plain" color="neutral" onClick={() => setSelectedProcessId(null)}>Fermer</Button>
            </Stack>
            <Divider />
            <Typography level="title-sm">Projets utilisateurs</Typography>
            {selectedProcess.projects.length > 0 ? selectedProcess.projects.map((project) => (
              <Stack key={project.projectId} direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
                <Typography level="body-sm">{project.projectName}</Typography>
                <Chip size="sm" variant="soft" color={usageColor[project.usage]}>{usageLabel[project.usage]}</Chip>
                {project.sourceResourceId && (
                  <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Source : {project.sourceResourceId}</Typography>
                )}
              </Stack>
            )) : <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Ce processus n’est associé à aucun projet.</Typography>}
            <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
              La modification du diagramme BPMN reste dans l’éditeur de processus et respecte les droits d’accès du projet.
            </Typography>
          </Card>
        )}

        {activeSection === 'processes' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Processus</th><th>Type d’utilisation</th><th>Projets utilisateurs</th><th>Source</th><th>Ouvrir</th></tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.id}>
                    <td><Typography level="title-sm">{process.name}</Typography>{process.description && <Typography level="body-xs" sx={{ color: 'text.secondary' }}>{process.description}</Typography>}</td>
                    <td>
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                        {Array.from(new Set(process.projects.map((project) => project.usage))).map((usage) => (
                          <Chip key={usage} size="sm" color={usageColor[usage]} variant="soft">{usageLabel[usage]}</Chip>
                        ))}
                        {process.projects.length === 0 && <Chip size="sm" variant="outlined">Non associé</Chip>}
                      </Stack>
                    </td>
                    <td>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {process.projects.map((project) => (
                          <Chip key={project.projectId} size="sm" variant="soft">{project.projectName} · {usageLabel[project.usage]}</Chip>
                        ))}
                      </Stack>
                    </td>
                    <td>{process.projects.find((project) => project.sourceResourceId)?.sourceResourceId ?? '—'}</td>
                    <td><Button size="sm" variant="outlined" onClick={() => setSelectedProcessId(process.id)}>Détails</Button></td>
                  </tr>
                ))}
                {processes.length === 0 && <tr><td colSpan={5}>Aucun processus correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

              {overview && isDataSection && (
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 2 }}>
                  {overview.users.length} utilisateurs avec adhésion · {overview.projects.length} projets · {overview.processes.length} ressources de type processus
                </Typography>
              )}
            </div>
          </main>
        </div>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'OrganizationAdministrationContainer';
