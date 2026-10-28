import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  Sheet,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';
import { CloseRounded, EditRounded, SaveRounded } from '@mui/icons-material';

import { apiClient } from '../../queryClient';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ProjectProcessOverview } from './ProjectProcessOverview';
import type { Resource } from '../../Types';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

type ProjectProcessLink = {
  id: string;
  projectId: string;
  resourceId: string;
  usage: 'common' | 'variant' | 'project-specific';
  sourceResourceId: string | null;
  resource: { id: string; name: string } | null;
};

type WorkspaceProjectSummary = {
  id: string;
  role: 'viewer' | 'modeler' | 'admin';
  processes: { resourceId: string; name: string; usage: 'common' | 'variant' | 'project-specific'; sourceResourceId: string | null }[];
};
type WorkspaceSummary = { userId: string; projects: WorkspaceProjectSummary[] };

export const FolderOverview = ({ resource }: { resource: Resource }) => {
  const projectId = resource.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const projectQuery = useQuery<Project>(
    ['project', projectId ?? ''],
    () => apiClient.get(`/projects/${projectId}`),
    { enabled: Boolean(projectId) },
  );
  const processesQuery = useQuery<ProjectProcessLink[]>(
    ['project-processes', projectId ?? ''],
    () => apiClient.get(`/projects/${projectId}/processes`),
    { enabled: Boolean(projectId) },
  );
  const workspaceQuery = useQuery<WorkspaceSummary>(
    ['my-workspace'],
    () => apiClient.get('/projects/me/workspace'),
    { enabled: Boolean(projectId) },
  );
  const membership = workspaceQuery.data?.projects.find((item) => item.id === projectId);
  const canEditDescription = membership?.role === 'admin';

  const updateDescription = useMutation(
    () => {
      if (!projectId) throw new Error('Aucun projet sélectionné.');
      return apiClient.put(`/projects/${projectId}`, { description: descriptionDraft.trim() });
    },
    {
      onSuccess: async () => {
        setEditingDescription(false);
        setError(null);
        await queryClient.invalidateQueries(['project', projectId ?? '']);
        await queryClient.invalidateQueries(['projects']);
        await queryClient.invalidateQueries(['my-workspace']);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const project = projectQuery.data;
  const processes = (processesQuery.data ?? [])
    .filter((link) => Boolean(link.resource))
    .map((link) => ({
      resourceId: link.resourceId,
      name: link.resource?.name ?? link.resourceId,
      usage: link.usage,
    }));

  return (
    <Sheet sx={{ width: '100%', maxWidth: 1440, boxSizing: 'border-box', mx: 'auto', p: { xs: 1, md: 2 }, bgcolor: 'transparent' }}>
      <Stack spacing={2}>
        <WorkspaceNavigation />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Button variant="plain" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/projects')}>
            ← Tous les projets
          </Button>
          {projectId && (
            <Button variant="outlined" color="neutral" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate(`/projects/${projectId}`)}>
              Administration du projet
            </Button>
          )}
        </Stack>

        {projectQuery.isLoading && <Typography>Chargement du projet…</Typography>}
        {projectQuery.isError && <Alert color="danger">Impossible de charger ce projet.</Alert>}
        {workspaceQuery.isError && <Alert color="warning">Le rôle du membre n’a pas pu être vérifié ; la modification de la description reste désactivée.</Alert>}
        {error && <Alert color="danger">{error}</Alert>}

        {project && (
          <>
            <Typography level="h2">{project.name}</Typography>
            <Card variant="outlined" sx={{ gap: 1.25 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography level="title-lg">Description du projet</Typography>
                {canEditDescription && !editingDescription && (
                  <IconButton
                    size="sm"
                    variant="plain"
                    color="neutral"
                    aria-label="Modifier la description du projet"
                    title="Modifier la description"
                    onClick={() => {
                      setDescriptionDraft(project.description ?? '');
                      setEditingDescription(true);
                    }}
                  >
                    <EditRounded />
                  </IconButton>
                )}
              </Stack>
              {editingDescription ? (
                <Stack spacing={1}>
                  <Textarea
                    minRows={3}
                    value={descriptionDraft}
                    onChange={(event) => setDescriptionDraft(event.target.value)}
                    placeholder="Décrivez les objectifs et le périmètre du projet"
                    aria-label="Description du projet"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="sm"
                      startDecorator={<SaveRounded />}
                      loading={updateDescription.isLoading}
                      onClick={() => updateDescription.mutate()}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="outlined"
                      color="neutral"
                      startDecorator={<CloseRounded />}
                      disabled={updateDescription.isLoading}
                      onClick={() => {
                        setDescriptionDraft(project.description ?? '');
                        setEditingDescription(false);
                      }}
                    >
                      Annuler
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography level="body-md" sx={{ whiteSpace: 'pre-wrap' }}>
                  {project.description?.trim() || 'Aucune description renseignée.'}
                </Typography>
              )}
            </Card>

            {processesQuery.isLoading && <Typography>Chargement des processus…</Typography>}
            {processesQuery.isError && <Alert color="danger">Impossible de charger les processus associés au projet.</Alert>}
            {!processesQuery.isLoading && !processesQuery.isError && processes.length === 0 && (
              <Card variant="outlined">
                <Typography level="title-lg">Processus du projet</Typography>
                <Typography level="body-sm" color="neutral">Aucun processus n’est encore associé à ce projet.</Typography>
              </Card>
            )}
            {!processesQuery.isError && processes.length > 0 && (
              <ProjectProcessOverview processes={processes} />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Typography level="body-xs" color="neutral">
                Les dates et auteurs affichés proviennent des métadonnées disponibles des contenus ; aucune validation formelle distincte n’est enregistrée.
              </Typography>
            </Box>
          </>
        )}
      </Stack>
    </Sheet>
  );
};

FolderOverview.displayName = 'FolderOverview';
