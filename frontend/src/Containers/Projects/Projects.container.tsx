import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
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
  Sheet,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { resourcesQuery } from '../../api/resources/resources.queries';
import { Resource } from '../../Types';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ProjectRaciPanel } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciPanel';
import { ProjectRaciManager } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciManager';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [usage, setUsage] = useState<'common' | 'project-specific'>('common');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'viewer' | 'modeler' | 'admin'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [activeProjectTab, setActiveProjectTab] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab === 'raci') return 2;
    if (tab === 'processes') return 1;
    return 0;
  });

  const projectsQuery = useQuery<Project[]>(
    projectsKey,
    () => apiClient.get('/projects'),
    { enabled: !projectId },
  );
  const workspaceQuery = useQuery<WorkspaceSummary>(
    ['my-workspace'],
    () => apiClient.get('/projects/me/workspace'),
    { enabled: !projectId },
  );
  const workspaceProjects = useMemo(
    () => new Map((workspaceQuery.data?.projects ?? []).map((item) => [item.id, item])),
    [workspaceQuery.data],
  );
  const projectQuery = useQuery<Project>(
    projectKey(projectId ?? ''),
    () => apiClient.get(`/projects/${projectId}`),
    { enabled: Boolean(projectId) },
  );
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

  const createProject = useMutation(
    () => apiClient.post('/projects', { name: name.trim(), description: description.trim() }),
    {
      onSuccess: async (project: Project) => {
        setName('');
        setDescription('');
        setError(null);
        await queryClient.invalidateQueries(projectsKey);
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
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const unlinkProcess = useMutation(
    (resourceId: string) => apiClient.remove(`/projects/${projectId}/processes/${resourceId}`),
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries(projectProcessesKey(projectId ?? ''));
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

  if (!projectId) {
    return (
      <Sheet sx={{ width: '100%', maxWidth: 1440, boxSizing: 'border-box', mx: 'auto', p: { xs: 1, md: 2 }, bgcolor: 'transparent' }}>
        <Stack spacing={2}>
          <WorkspaceNavigation />
          <Typography level="h2">Projets</Typography>
          <Button variant="outlined" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/organization/users')}>Administration de l’organisation →</Button>
          <Typography level="body-md">
            Retrouvez vos projets, votre rôle et les processus associés au même endroit. L’administration globale de l’organisation reste distincte et réservée aux comptes autorisés.
          </Typography>
          {error && <Alert color="danger">{error}</Alert>}
          <Card variant="outlined">
            <Typography level="title-lg">Créer un projet</Typography>
            <Stack spacing={1.5}>
              <FormControl required>
                <FormLabel>Nom du projet</FormLabel>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Refonte RH" />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objectif et périmètre" />
              </FormControl>
              <Box>
                <Button loading={createProject.isLoading} disabled={!name.trim()} onClick={() => createProject.mutate()}>
                  Créer le projet
                </Button>
              </Box>
            </Stack>
          </Card>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Typography level="title-lg">Vos projets</Typography>
            {workspaceQuery.data && <Chip variant="soft">{workspaceQuery.data.projects.length} projet(s) accessible(s)</Chip>}
          </Stack>
          {projectsQuery.isLoading && <Typography>Chargement des projets…</Typography>}
          {workspaceQuery.isError && <Alert color="warning">Les informations de rôle et de processus ne sont pas disponibles pour le moment. La liste des projets reste consultable.</Alert>}
          {projectsQuery.isError && <Alert color="danger">Impossible de charger les projets.</Alert>}
          {!projectsQuery.isLoading && (projectsQuery.data?.length ?? 0) === 0 && (
            <Typography level="body-sm">Aucun projet pour le moment.</Typography>
          )}
          <Stack spacing={1}>
            {(projectsQuery.data ?? []).map((project) => {
              const membership = workspaceProjects.get(project.id);
              const processCount = membership?.processes.length;
              return (
                <Card key={project.id} variant="outlined" sx={{ gap: 1.25 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography level="title-md">{project.name}</Typography>
                      {project.description && <Typography level="body-sm">{project.description}</Typography>}
                    </Box>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      {membership && <Chip size="sm" variant="soft" color={projectRoleColors[membership.role]}>{projectRoleLabels[membership.role]}</Chip>}
                      {processCount !== undefined && <Chip size="sm" variant="outlined">{processCount} processus</Chip>}
                    </Stack>
                  </Stack>
                  {membership && membership.processes.length > 0 && (
                    <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                      {membership.processes.slice(0, 3).map((process) => process.name).join(' · ')}
                      {membership.processes.length > 3 ? ` · +${membership.processes.length - 3} autre(s)` : ''}
                    </Typography>
                  )}
                  <Box>
                    <Button variant="soft" onClick={() => navigate(`/projects/${project.id}`)}>Ouvrir le projet</Button>
                  </Box>
                </Card>
              );
            })}
          </Stack>
          <Button variant="plain" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/root')}>Retour au référentiel BPMN</Button>
        </Stack>
      </Sheet>
    );
  }

  const project = projectQuery.data;
  return (
    <Sheet sx={{ width: '100%', maxWidth: 1440, boxSizing: 'border-box', mx: 'auto', p: { xs: 1, md: 2 }, bgcolor: 'transparent' }}>
      <Stack spacing={2}>
          <WorkspaceNavigation />
        <Button variant="plain" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/projects')}>← Tous les projets</Button>
        <Button variant="outlined" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/organization/projects')}>Administration de l’organisation →</Button>
        {projectQuery.isLoading && <Typography>Chargement du projet…</Typography>}
        {projectQuery.isError && <Alert color="danger">Impossible de charger ce projet.</Alert>}
        {project && (
          <>
            <Typography level="h2">{project.name}</Typography>
            {project.description && <Typography level="body-md">{project.description}</Typography>}
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
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 0.5,
              p: 0.5,
              borderRadius: 'md',
              bgcolor: 'background.level1',
            }}
          >
            <Tab value={0}>Membres et rôles du projet</Tab>
            <Tab value={1}>Processus du projet</Tab>
            <Tab value={2}>Gestion du RACI du projet</Tab>
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
                  {link.resource && <Button variant="soft" onClick={() => navigate(`/${link.resourceId}`)}>Ouvrir</Button>}
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
          </TabPanel>
          <TabPanel value={2} sx={{ px: 0, py: 2 }}>
          <Card variant="outlined">
            <Typography level="title-lg">Gestion du RACI du projet</Typography>
            <Typography level="body-sm">
              Les affectations ci-dessous sont propres à ce projet. Elles sont enregistrées indépendamment des propriétés RACI présentes dans les fichiers BPMN.
            </Typography>
            <ProjectRaciManager
              projectId={projectId}
              onActivityClick={(targetResourceId, elementId) =>
                navigate(`/${targetResourceId}?elementId=${encodeURIComponent(elementId)}`)
              }
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
        </Tabs>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'ProjectsContainer';
