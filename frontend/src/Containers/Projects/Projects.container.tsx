import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Chip,
  Button,
  Card,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Stack,
  Sheet,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { resourcesQuery } from '../../api/resources/resources.queries';
import { contentsQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, Resource } from '../../Types';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ProjectRaciPanel } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciPanel';
import { ProjectRaciManager } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciManager';
import { ProjectProcessHierarchy } from './ProjectProcessHierarchy';
import { WorkspacePageLayout } from '../../Components/GenericComponents/WorkspacePageLayout/WorkspacePageLayout';
import { Header } from '../../Components/GenericComponents/Header/Header';
import { useActiveProject } from '../../shared/hooks/useActiveProject';
import { ViewerExplorerPanel } from '../../Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel';
import { getProjectTrigram } from '../../shared/helpers/projectTrigram';
import '../../Components/BusinessComponents/ProcessDetails/ProcessDetails.scss';

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  trigram: string | null;
  icon: string;
  createdAt: string;
  defaultValidatorUserId: string | null;
};

type WorkspaceProjectSummary = {
  id: string;
  role: 'viewer' | 'modeler' | 'admin';
  processes: { resourceId: string; name: string; usage: 'common' | 'variant' | 'project-specific'; sourceResourceId: string | null }[];
};
type WorkspaceSummary = { userId: string; projects: WorkspaceProjectSummary[] };

const projectRoleLabels: Record<WorkspaceProjectSummary['role'], string> = {
  viewer: 'Consultation',
  modeler: 'Modélisation',
  admin: 'Administration du projet',
};

const projectRoleColors: Record<WorkspaceProjectSummary['role'], 'neutral' | 'primary' | 'warning'> = {
  viewer: 'neutral',
  modeler: 'primary',
  admin: 'warning',
};

type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: 'viewer' | 'modeler' | 'admin';
};

type ProjectProcessLink = {
  id: string;
  projectId: string;
  resourceId: string;
  usage: 'common' | 'variant' | 'project-specific';
  sourceResourceId: string | null;
  resource: Resource | null;
};

const projectsKey = ['projects'];
const projectKey = (id: string) => ['project', id];
const projectProcessesKey = (id: string) => ['project-processes', id];
const PROCESS_USAGE_LABELS: Record<ProjectProcessLink['usage'], string> = {
  common: 'Processus commun',
  variant: 'Variante',
  'project-specific': 'Spécifique au projet',
};

export const Component = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    projects: accessibleProjects,
    activeProjectId,
    setActiveProject,
    isLoading: workspaceProjectsLoading,
  } = useActiveProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectColor, setProjectColor] = useState('#2864d7');
  const [projectTrigram, setProjectTrigram] = useState('');
  const [defaultValidatorUserId, setDefaultValidatorUserId] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [usage, setUsage] = useState<'common' | 'project-specific'>('common');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'viewer' | 'modeler' | 'admin'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('bpmn-viewer-explorer-width'));
    return Number.isFinite(saved) && saved >= 180 && saved <= 480 ? saved : 248;
  });
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [activeProjectTab, setActiveProjectTab] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab === 'raci') return 2;
    if (tab === 'processes') return 1;
    if (tab === 'validation') return 3;
    return 0;
  });

  const workspaceQuery = useQuery<WorkspaceSummary>(
    ['my-workspace'],
    () => apiClient.get('/projects/me/workspace'),
    { enabled: true },
  );
  const projectQuery = useQuery<Project>(
    projectKey(projectId ?? ''),
    () => apiClient.get(`/projects/${projectId}`),
    { enabled: Boolean(projectId) },
  );
  useEffect(() => {
    if (!projectQuery.data) return;
    setProjectColor(projectQuery.data.color || '#2864d7');
    setProjectTrigram(projectQuery.data.trigram ?? '');
    setDefaultValidatorUserId(projectQuery.data.defaultValidatorUserId ?? null);
  }, [projectQuery.data]);
  const projectMembership = workspaceQuery.data?.projects.find(item => item.id === projectId);
  const canManageProjectIdentity = projectMembership?.role === 'admin';

  const linkedProcessesQuery = useQuery<ProjectProcessLink[]>(
    projectProcessesKey(projectId ?? ''),
    () => apiClient.get(`/projects/${projectId}/processes`),
    { enabled: Boolean(projectId) },
  );
  const membersQuery = useQuery<ProjectMember[]>(
    ['project-members', projectId ?? ''],
    () => apiClient.get(`/projects/${projectId}/members`),
    { enabled: Boolean(projectId) },
  );
  const availableResourcesQuery = resourcesQuery({ type: ResourceType.Process });
  const availableProcesses = useQuery<Resource[]>(
    availableResourcesQuery.queryKey,
    availableResourcesQuery.queryFn,
    { enabled: Boolean(projectId) },
  );

  const updateProjectIdentity = useMutation(
    () => {
      if (!projectId) throw new Error('Aucun projet sélectionné.');
      return apiClient.put(`/projects/${projectId}`, {
        color: projectColor,
        trigram: projectTrigram.trim() || null,
      });
    },
    {
      onSuccess: async () => {
        setError(null);
        await queryClient.invalidateQueries(projectKey(projectId ?? ''));
        await queryClient.invalidateQueries(projectsKey);
        await queryClient.invalidateQueries(['my-workspace']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const updateDefaultValidator = useMutation(
    () => {
      if (!projectId) throw new Error('Aucun projet sélectionné.');
      return apiClient.put(`/projects/${projectId}`, {
        defaultValidatorUserId: defaultValidatorUserId || null,
      });
    },
    {
      onSuccess: async () => {
        setError(null);
        await queryClient.invalidateQueries(projectKey(projectId ?? ''));
        await queryClient.invalidateQueries(['my-workspace']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const createProject = useMutation(
    () => apiClient.post('/projects', { name: name.trim(), description: description.trim() }),
    {
      onSuccess: async (project: Project) => {
        setName('');
        setDescription('');
        setError(null);
        await queryClient.invalidateQueries(projectsKey);
        await queryClient.invalidateQueries(['my-workspace']);
        navigate(`/projects/${project.id}`);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const linkProcess = useMutation(
    () => {
      if (!projectId || !selectedProcessId) throw new Error('Sélectionnez un processus.');
      return apiClient.post(`/projects/${projectId}/processes`, {
        resourceId: selectedProcessId,
        usage,
      });
    },
    {
      onSuccess: async () => {
        setSelectedProcessId(null);
        setError(null);
        await queryClient.invalidateQueries(projectProcessesKey(projectId ?? ''));
        await queryClient.invalidateQueries(['my-workspace']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const unlinkProcess = useMutation(
    (resourceId: string) => apiClient.remove(`/projects/${projectId}/processes/${resourceId}`),
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries(projectProcessesKey(projectId ?? ''));
        await queryClient.invalidateQueries(['my-workspace']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  // Common processes stay immutable in the shared catalogue. Editing one in a
  // project starts by creating an independent, editable variant.
  const createProcessVariant = useMutation(
    (sourceResourceId: string) => {
      if (!projectId) throw new Error('Aucun projet sélectionné.');
      return apiClient.post(`/projects/${projectId}/processes/variants`, {
        sourceResourceId,
      });
    },
    {
      onSuccess: async (result: { resource: Resource }) => {
        setError(null);
        await queryClient.invalidateQueries(projectProcessesKey(projectId ?? ''));
        await queryClient.invalidateQueries(availableResourcesQuery.queryKey);
        navigate(`/${result.resource.id}/modeler`);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );


  const setProjectMember = useMutation(
    () => {
      if (!projectId || !memberUserId.trim()) throw new Error('Saisissez l’identifiant de l’utilisateur.');
      return apiClient.put(
        `/projects/${projectId}/members/${encodeURIComponent(memberUserId.trim())}`,
        { role: memberRole },
      );
    },
    {
      onSuccess: async () => {
        setMemberUserId('');
        setError(null);
        await queryClient.invalidateQueries(['project-members', projectId ?? '']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const removeProjectMember = useMutation(
    (userId: string) => apiClient.remove(
      `/projects/${projectId}/members/${encodeURIComponent(userId)}`,
    ),
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries(['project-members', projectId ?? '']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const linkedResourceIds = useMemo(
    () => new Set((linkedProcessesQuery.data ?? []).map((item) => item.resourceId)),
    [linkedProcessesQuery.data],
  );
  const unlinkedProcesses = (availableProcesses.data ?? []).filter(
    (resource) => !linkedResourceIds.has(resource.id),
  );
  const processSummary = useMemo(() => {
    const links = linkedProcessesQuery.data ?? [];
    return {
      total: links.length,
      common: links.filter((link) => link.usage === 'common').length,
      variants: links.filter((link) => link.usage === 'variant').length,
      specific: links.filter((link) => link.usage === 'project-specific').length,
    };
  }, [linkedProcessesQuery.data]);

  useEffect(() => {
    window.localStorage.setItem('bpmn-viewer-explorer-width', String(explorerWidth));
  }, [explorerWidth]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const startExplorerResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeCleanupRef.current?.();
    const startX = event.clientX;
    const startWidth = explorerWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      setExplorerWidth(Math.min(480, Math.max(180, startWidth + moveEvent.clientX - startX)));
    };
    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', cleanup);
      resizeCleanupRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', cleanup);
    resizeCleanupRef.current = cleanup;
  };

  const uniqueWorkspaceProcesses = useMemo(() => {
    const byId = new Map<string, { resourceId: string; name: string }>();
    accessibleProjects.forEach(project => project.processes.forEach(process => {
      if (!byId.has(process.resourceId)) {
        byId.set(process.resourceId, { resourceId: process.resourceId, name: process.name });
      }
    }));
    return Array.from(byId.values());
  }, [accessibleProjects]);

  const workspaceContentQueries = useQueries(
    projectId ? [] : uniqueWorkspaceProcesses.map(process => contentsQuery(process.resourceId)),
  );
  const workspaceStats = useMemo(() => {
    const published = new Set<string>();
    const recentlyChanged = new Set<string>();
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    uniqueWorkspaceProcesses.forEach((process, index) => {
      const contents = (workspaceContentQueries[index]?.data as Content[] | undefined) ?? [];
      if (contents.some(content => content.status === ContentStatusEnum.Published)) {
        published.add(process.resourceId);
      }
      if (contents.some(content => {
        const timestamp = new Date(content.updatedAt ?? content.createdAt).getTime();
        return Number.isFinite(timestamp) && timestamp >= recentCutoff;
      })) {
        recentlyChanged.add(process.resourceId);
      }
    });
    return {
      projects: accessibleProjects.length,
      processes: uniqueWorkspaceProcesses.length,
      published: published.size,
      recentlyChanged: recentlyChanged.size,
      contentLoading: workspaceContentQueries.some(query => query.isLoading),
    };
  }, [accessibleProjects, uniqueWorkspaceProcesses, workspaceContentQueries]);

  if (!projectId) {
    return (
      <WorkspacePageLayout>
        <Header
          title="Tous les projets"
          description="Vos espaces de travail et les processus auxquels vous avez accès."
          breadcrumbs={[{ id: 'home', label: 'Tous les projets', to: '/projects' }]}
        />
        <Box
          className="processViewerLayout processViewerWorkspace"
          style={{ "--explorer-width": `${explorerWidth}px` } as React.CSSProperties}
          sx={{ height: 'calc(100vh - 176px)', minHeight: 460 }}
        >
          <ViewerExplorerPanel
            variant="projects-overview"
            selectedId="projects"
            onNodeClick={() => undefined}
            collapsed={explorerCollapsed}
            onToggle={() => setExplorerCollapsed(value => !value)}
            projects={accessibleProjects}
            activeProjectId={activeProjectId}
            onProjectSelect={selectedProjectId => {
              setActiveProject(selectedProjectId);
              navigate('/root');
            }}
          />
          {!explorerCollapsed && (
            <Box
              className="processViewerResizeHandle"
              role="separator"
              aria-label="Redimensionner le panneau des projets"
              title="Glisser pour régler la largeur de l’explorateur"
              onMouseDown={startExplorerResize}
            />
          )}
          <Sheet
            className="processViewerDiagram processViewerInfo projectsOverviewPanel"
            variant="outlined"
            sx={{
              p: 2,
              gap: 2,
              overflow: 'auto',
              alignItems: 'stretch',
              flex: '1 1 0',
              minWidth: 0,
              minHeight: 0,
              borderRadius: 0,
            }}
          >
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
                <Card variant="outlined" sx={{ gap: 0.5 }}>
                  <Typography level="body-sm" color="neutral">Projets accessibles</Typography>
                  <Typography level="h2">{workspaceStats.projects}</Typography>
                </Card>
                <Card variant="outlined" sx={{ gap: 0.5 }}>
                  <Typography level="body-sm" color="neutral">Processus distincts</Typography>
                  <Typography level="h2">{workspaceStats.processes}</Typography>
                </Card>
                <Card variant="outlined" sx={{ gap: 0.5 }}>
                  <Typography level="body-sm" color="neutral">Processus publiés</Typography>
                  <Typography level="h2">{workspaceStats.contentLoading ? '…' : workspaceStats.published}</Typography>
                </Card>
                <Card variant="outlined" sx={{ gap: 0.5 }}>
                  <Typography level="body-sm" color="neutral">Modifiés sur 30 jours</Typography>
                  <Typography level="h2">{workspaceStats.contentLoading ? '…' : workspaceStats.recentlyChanged}</Typography>
                </Card>
              </Box>

              {error && <Alert color="danger">{error}</Alert>}
              {workspaceProjectsLoading && <Typography level="body-sm" color="neutral">Chargement de vos projets…</Typography>}
              {workspaceQuery.isError && (
                <Alert color="warning">
                  Impossible de charger la liste des projets accessibles. Réessayez dans quelques instants.
                </Alert>
              )}

              <Card variant="outlined" sx={{ gap: 1.25 }}>
                <Typography level="title-lg">Créer un projet</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-end' }}>
                  <FormControl required sx={{ flex: 1 }}>
                    <FormLabel>Nom du projet</FormLabel>
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Refonte RH" />
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Description</FormLabel>
                    <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objectif et périmètre" />
                  </FormControl>
                  <Button loading={createProject.isLoading} disabled={!name.trim()} onClick={() => createProject.mutate()}>
                    Créer le projet
                  </Button>
                </Stack>
              </Card>

              <Stack spacing={1.25}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography level="title-lg">Vos projets</Typography>
                  <Chip variant="soft">{accessibleProjects.length} projet(s)</Chip>
                </Stack>
                {accessibleProjects.length === 0 && !workspaceProjectsLoading && (
                  <Card variant="outlined">
                    <Typography level="body-sm" color="neutral">Aucun projet ne vous est actuellement associé.</Typography>
                  </Card>
                )}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                  {accessibleProjects.map(project => (
                    <Card key={project.id} variant="outlined" sx={{ gap: 1.25 }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Box
                          component="span"
                          title={project.name}
                          sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 42, height: 30, px: 0.75, borderRadius: '7px', bgcolor: project.color || '#2864d7', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}
                        >
                          {getProjectTrigram(project.name, project.trigram)}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography level="title-md">{project.name}</Typography>
                          {project.description && (
                            <Typography level="body-sm" color="neutral">{project.description}</Typography>
                          )}
                        </Box>
                        <Chip size="sm" variant="soft" color={projectRoleColors[project.role]}>
                          {projectRoleLabels[project.role]}
                        </Chip>
                      </Stack>
                      <Chip size="sm" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
                        {project.processes.length} processus associés
                      </Chip>
                      {project.processes.length > 0 && (
                        <Typography level="body-sm" color="neutral">
                          {project.processes.slice(0, 3).map(process => process.name).join(' · ')}
                          {project.processes.length > 3 ? ` · +${project.processes.length - 3} autre(s)` : ''}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button variant="soft" onClick={() => { setActiveProject(project.id); navigate('/root'); }}>
                          Ouvrir le projet
                        </Button>
                        <Button variant="outlined" color="neutral" onClick={() => navigate(`/projects/${project.id}`)}>
                          Administration
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </Box>
              </Stack>
            </Stack>
          </Sheet>
        </Box>
      </WorkspacePageLayout>
    );
  }

  const project = projectQuery.data;
  return (
    <WorkspacePageLayout>
      <Header
        isLoading={projectQuery.isLoading}
        title={project?.name ?? 'Administration du projet'}
        description={project?.description ?? 'Paramètres et processus associés à ce projet.'}
        breadcrumbs={[
          { id: 'home', label: 'Tous les projets', to: '/projects' },
          ...(project ? [{ id: 'project', label: project.name, to: `/projects/${projectId}` }] : []),
        ]}
        actions={(
          <Button variant="outlined" color="neutral" onClick={() => {
            if (projectId) setActiveProject(projectId);
            navigate('/root');
          }}>
            Référentiel
          </Button>
        )}
      />
      <Stack
        spacing={2}
        sx={{
          boxSizing: 'border-box',
          minWidth: 0,
          p: 2,
          border: '1px solid',
          borderColor: 'neutral.outlinedBorder',
          bgcolor: 'background.surface',
          borderRadius: 0,
        }}
      >
        {projectQuery.isLoading && <Typography>Chargement du projet…</Typography>}
        {projectQuery.isError && <Alert color="danger">Impossible de charger ce projet.</Alert>}
        {project && (
          <>
            {canManageProjectIdentity && (
              <Card variant="outlined" sx={{ gap: 1.25 }}>
                <Typography level="title-lg">Identité visuelle du projet</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
                  <Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    <Typography level="body-sm">Couleur du projet</Typography>
                    <Input type="color" value={projectColor} onChange={event => setProjectColor(event.target.value)} aria-label="Couleur du projet" />
                  </Stack>
                  <Stack spacing={0.5} sx={{ minWidth: 140 }}>
                    <Typography level="body-sm">Trigramme du projet</Typography>
                    <Input
                      value={projectTrigram}
                      onChange={event => setProjectTrigram(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                      placeholder="Ex. RHX"
                      aria-label="Trigramme du projet"
                    />
                    <Typography level="body-xs" color="neutral">3 caractères alphanumériques ; vide = génération automatique.</Typography>
                  </Stack>
                  <Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    <Typography level="body-sm">Aperçu du badge</Typography>
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 48, height: 34, px: 1, borderRadius: '7px', bgcolor: projectColor, color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em' }}
                    >
                      {getProjectTrigram(project.name, projectTrigram)}
                    </Box>
                  </Stack>
                  <Button loading={updateProjectIdentity.isLoading} disabled={updateProjectIdentity.isLoading || (projectTrigram.length > 0 && projectTrigram.length !== 3)} onClick={() => updateProjectIdentity.mutate()}>
                    Enregistrer l’identité visuelle
                  </Button>
                </Stack>
              </Card>
            )}
            <Typography level="body-sm">
              Les processus communs sont référencés, pas copiés. Les retirer du projet ne supprime pas le processus du catalogue.
            </Typography>
          </>
        )}
        {error && <Alert color="danger">{error}</Alert>}

        <Tabs
          value={activeProjectTab}
          onChange={(_event, value) => value !== null && setActiveProjectTab(value as number)}
          sx={{ minWidth: 0, width: '100%' }}
        >
          <TabList
            variant="soft"
            color="neutral"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' },
              gap: 0.5,
              p: 0.5,
              borderRadius: 'md',
              bgcolor: 'background.level1',
            }}
          >
            <Tab value={0}>Membres et rôles du projet</Tab>
            <Tab value={1}>Processus du projet</Tab>
            <Tab value={2}>Gestion du RACI du projet</Tab>
            <Tab value={3}>Validation</Tab>
          </TabList>
          <TabPanel value={0} sx={{ px: 0, py: 2 }}>
          <Card variant="outlined">
            <Typography level="title-lg">Membres et rôles du projet</Typography>
            <Typography level="body-sm">
              Identifiant utilisateur attendu : la même valeur que celle transmise par le proxy dans l’en-tête utilisateur. Les rôles sont contrôlés par l’API pour les opérations sur les projets et les processus associés. Les droits ACL globaux de la plateforme restent également applicables.
            </Typography>
            <Stack spacing={1.5}>
              <FormControl>
                <FormLabel>Identifiant utilisateur</FormLabel>
                <Input value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)} placeholder="Identifiant exact de l’utilisateur" />
              </FormControl>
              <FormControl>
                <FormLabel>Rôle du projet</FormLabel>
                <Select value={memberRole} onChange={(_event, value) => value && setMemberRole(value as 'viewer' | 'modeler' | 'admin')}>
                  <Option value="viewer">Viewer — consultation</Option>
                  <Option value="modeler">Modeler — modification des processus</Option>
                  <Option value="admin">Admin — administration du projet</Option>
                </Select>
              </FormControl>
              <Box>
                <Button loading={setProjectMember.isLoading} disabled={!memberUserId.trim()} onClick={() => setProjectMember.mutate()}>
                  Enregistrer le rôle
                </Button>
              </Box>
            </Stack>
            <Typography level="title-md">Membres enregistrés</Typography>
            {membersQuery.isLoading && <Typography>Chargement des membres…</Typography>}
            {membersQuery.isError && <Alert color="danger">Impossible de charger les membres.</Alert>}
            {(membersQuery.data ?? []).map((member) => (
              <Card key={member.id} variant="soft" orientation="horizontal" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography level="title-sm">{member.userId}</Typography>
                  <Typography level="body-sm">{member.role}</Typography>
                </Box>
                <Button color="danger" variant="plain" loading={removeProjectMember.isLoading} onClick={() => removeProjectMember.mutate(member.userId)}>Retirer</Button>
              </Card>
            ))}
          </Card>
          </TabPanel>
          <TabPanel value={1} sx={{ px: 0, py: 2 }}>
          <Card variant="outlined">
            <Typography level="title-lg">Ajouter un processus au projet</Typography>
            {availableProcesses.isLoading && <Typography>Chargement du catalogue…</Typography>}
            <Stack spacing={1.5}>
              <FormControl>
                <FormLabel>Processus du référentiel</FormLabel>
                <Select
                  placeholder="Choisir un processus"
                  value={selectedProcessId}
                  onChange={(_event, value) => setSelectedProcessId(value)}
                >
                  {unlinkedProcesses.map((resource) => (
                    <Option key={resource.id} value={resource.id}>{resource.name}</Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Usage dans le projet</FormLabel>
                <Select
                  value={usage}
                  onChange={(_event, value) => value && setUsage(value as 'common' | 'project-specific')}
                >
                  <Option value="common">Processus commun réutilisé</Option>
                  <Option value="project-specific">Processus spécifique au projet</Option>
                </Select>
              </FormControl>
              <Box>
                <Button loading={linkProcess.isLoading} disabled={!selectedProcessId} onClick={() => linkProcess.mutate()}>
                  Ajouter au projet
                </Button>
              </Box>
            </Stack>
          </Card>
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Typography level="title-lg">Vue d’ensemble du projet</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip variant="outlined">{processSummary.total} processus au total</Chip>
              <Chip color="success" variant="soft">{processSummary.common} commun(s)</Chip>
              <Chip color="warning" variant="soft">{processSummary.variants} variante(s)</Chip>
              <Chip color="primary" variant="soft">{processSummary.specific} spécifique(s)</Chip>
            </Stack>
            <Typography level="body-sm">Les processus communs sont partagés entre projets ; les variantes permettent une adaptation indépendante ; les processus spécifiques restent propres à ce projet.</Typography>
          </Card>
          <Typography level="title-lg">Processus du projet</Typography>
          {linkedProcessesQuery.isLoading && <Typography>Chargement des processus…</Typography>}
          {linkedProcessesQuery.isError && <Alert color="danger">Impossible de charger les processus liés au projet.</Alert>}
          {(linkedProcessesQuery.data ?? []).length === 0 && !linkedProcessesQuery.isLoading && (
            <Typography level="body-sm">Aucun processus associé. Vous pouvez en ajouter depuis le référentiel ci-dessus.</Typography>
          )}
          <Stack spacing={1}>
            {(linkedProcessesQuery.data ?? []).map((link) => (
              <Card key={link.id} variant="outlined" orientation="horizontal" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography level="title-md">{link.resource?.name ?? link.resourceId}</Typography>
                  <Typography level="body-sm">
                    {PROCESS_USAGE_LABELS[link.usage]}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  {link.resource && <Button variant="soft" onClick={() => { if (projectId) setActiveProject(projectId); navigate(`/${link.resourceId}`); }}>Ouvrir</Button>}
                  {link.usage === 'common' && (
                    <Button
                      variant="solid"
                      loading={createProcessVariant.isLoading}
                      disabled={createProcessVariant.isLoading}
                      onClick={() => createProcessVariant.mutate(link.resourceId)}
                    >
                      Créer une variante modifiable
                    </Button>
                  )}
                  <Button color="danger" variant="plain" loading={unlinkProcess.isLoading} onClick={() => unlinkProcess.mutate(link.resourceId)}>Retirer</Button>
                </Stack>
              </Card>
            ))}
          </Stack>
          <ProjectProcessHierarchy
            processes={(linkedProcessesQuery.data ?? [])
              .filter(link => Boolean(link.resource))
              .map(link => ({
                resourceId: link.resourceId,
                name: link.resource?.name ?? link.resourceId,
              }))}
          />
          </TabPanel>
          <TabPanel value={2} sx={{ px: 0, py: 2 }}>
          <Card variant="outlined">
            <Typography level="title-lg">Gestion du RACI du projet</Typography>
            <Typography level="body-sm">
              Les affectations ci-dessous sont propres à ce projet. Elles sont enregistrées indépendamment des propriétés RACI présentes dans les fichiers BPMN.
            </Typography>
            <ProjectRaciManager
              projectId={projectId}
              onActivityClick={(targetResourceId, elementId) => {
                if (projectId) setActiveProject(projectId);
                navigate(`/${targetResourceId}?elementId=${encodeURIComponent(elementId)}`);
              }}
            />
          </Card>
          <Card variant="outlined">
            <Typography level="title-lg">Synthèse RACI des diagrammes publiés</Typography>
            <Typography level="body-sm">
              Lecture seule : synthèse des rôles extraits des dernières versions publiées des processus associés au projet.
            </Typography>
            <ProjectRaciPanel
              projectId={projectId}
              onActivityClick={(targetResourceId, elementId) => navigate(`/${targetResourceId}?elementId=${encodeURIComponent(elementId)}`)}
            />
          </Card>
          </TabPanel>
          <TabPanel value={3} sx={{ px: 0, py: 2 }}>
          <Card variant="outlined" sx={{ gap: 1.25 }}>
            <Typography level="title-lg">Validation des processus</Typography>
            <Typography level="body-sm" color="neutral">
              Le validateur par défaut est utilisé lorsque le processus ne désigne pas son propre pilote ou validateur. Le pilote indiqué dans le processus reste prioritaire.
            </Typography>
            {membersQuery.isLoading && <Typography level="body-sm" color="neutral">Chargement des membres du projet…</Typography>}
            {membersQuery.isError && <Alert color="danger">Impossible de charger les membres du projet : sélection du validateur indisponible.</Alert>}
            <FormControl>
              <FormLabel>Validateur par défaut du projet</FormLabel>
              <Select
                value={defaultValidatorUserId ?? ''}
                onChange={(_event, value) => setDefaultValidatorUserId(value || null)}
                placeholder="Choisir un membre du projet"
              >
                <Option value="">Aucun validateur par défaut</Option>
                {(membersQuery.data ?? []).map(member => (
                  <Option key={member.userId} value={member.userId}>{member.userId}</Option>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Button
                loading={updateDefaultValidator.isLoading}
                disabled={updateDefaultValidator.isLoading || membersQuery.isLoading}
                onClick={() => updateDefaultValidator.mutate()}
              >
                Enregistrer le validateur
              </Button>
            </Box>
          </Card>
          </TabPanel>
        </Tabs>
      </Stack>
    </WorkspacePageLayout>
  );
};

Component.displayName = 'ProjectsContainer';
