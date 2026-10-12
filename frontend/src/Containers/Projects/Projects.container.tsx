import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { resourcesQuery } from '../../api/resources/resources.queries';
import { Resource } from '../../Types';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ProjectRaciPanel } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciPanel';
import { ProjectRaciManager } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciManager';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
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
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [usage, setUsage] = useState<'common' | 'project-specific'>('common');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'viewer' | 'modeler' | 'admin'>('viewer');
  const [error, setError] = useState<string | null>(null);

  const projectsQuery = useQuery<Project[]>(
    projectsKey,
    () => apiClient.get('/projects'),
    { enabled: !projectId },
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

  if (!projectId) {
    return (
      <Sheet sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Stack spacing={2}>
          <Typography level="h2">Projets</Typography>
          <Typography level="body-md">
            Les projets référencent les processus du catalogue commun. Un processus partagé reste dans le référentiel et peut être réutilisé par plusieurs projets.
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
          <Typography level="title-lg">Projets existants</Typography>
          {projectsQuery.isLoading && <Typography>Chargement des projets…</Typography>}
          {projectsQuery.isError && <Alert color="danger">Impossible de charger les projets.</Alert>}
          {!projectsQuery.isLoading && (projectsQuery.data?.length ?? 0) === 0 && (
            <Typography level="body-sm">Aucun projet pour le moment.</Typography>
          )}
          <Stack spacing={1}>
            {(projectsQuery.data ?? []).map((project) => (
              <Card key={project.id} variant="outlined" orientation="horizontal" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography level="title-md">{project.name}</Typography>
                  {project.description && <Typography level="body-sm">{project.description}</Typography>}
                </Box>
                <Button variant="soft" onClick={() => navigate(`/projects/${project.id}`)}>Ouvrir</Button>
              </Card>
            ))}
          </Stack>
          <Button variant="plain" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/root')}>Retour au référentiel BPMN</Button>
        </Stack>
      </Sheet>
    );
  }

  const project = projectQuery.data;
  return (
    <Sheet sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Stack spacing={2}>
        <Button variant="plain" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/projects')}>← Tous les projets</Button>
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
                <Button color="danger" variant="plain" loading={unlinkProcess.isLoading} onClick={() => unlinkProcess.mutate(link.resourceId)}>Retirer</Button>
              </Stack>
            </Card>
          ))}
        </Stack>
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
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'ProjectsContainer';
