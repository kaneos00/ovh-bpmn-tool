import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  Chip,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';
import { CloseRounded, DescriptionOutlined, EditRounded, FolderOutlined, SaveRounded } from '@mui/icons-material';

import { resourcesQuery } from '../../api/resources/resources.queries';
import { apiClient } from '../../queryClient';
import { useActiveProject } from '../../shared/hooks/useActiveProject';
import { ProjectProcessOverview } from './ProjectProcessOverview';
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';

const projectIconLabels: Record<string, string> = {
  folder: '📁', briefcase: '💼', building: '🏢', workflow: '🔀', users: '👥', chart: '📊',
};

type FolderOverviewProps = {
  resource: Resource;
};

export const FolderOverview = ({ resource }: FolderOverviewProps) => {
  const { id: resourceId } = resource;
  const navigate = useNavigate();
  const resources = useQuery<Resource[]>(resourcesQuery());
  const { activeProject, activeProjectId, projectProcessIds } = useActiveProject();
  const queryClient = useQueryClient();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const updateDescription = useMutation(
    () => {
      if (!activeProjectId) throw new Error('Aucun projet actif.');
      return apiClient.put(`/projects/${activeProjectId}`, { description: descriptionDraft.trim() });
    },
    {
      onSuccess: async () => {
        setEditingDescription(false);
        setDescriptionError(null);
        await queryClient.invalidateQueries(['my-workspace']);
        await queryClient.invalidateQueries(['projects']);
        await queryClient.invalidateQueries(['project', activeProjectId ?? '']);
      },
      onError: (error: Error) => setDescriptionError(error.message),
    },
  );

  const children = useMemo(() => {
    const allResources = resources.data ?? [];
    const allowedIds = new Set(projectProcessIds);
    const byId = new Map(allResources.map(item => [item.id, item]));
    projectProcessIds.forEach(id => {
      let current = byId.get(id);
      while (current?.parentId) {
        allowedIds.add(current.parentId);
        current = byId.get(current.parentId);
      }
    });
    return allResources
      .filter(childResource => allowedIds.has(childResource.id) && (childResource.parentId ?? 'root') === resourceId)
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === ResourceType.Folder ? -1 : 1;
        }
        return left.name.localeCompare(right.name, 'fr');
      });
  }, [resources.data, resourceId, projectProcessIds]);

  if (resources.isLoading) {
    return (
      <Card variant="outlined" sx={{ flex: 1, minHeight: 220, gap: 1 }}>
        <Typography level="title-lg">{resourceId === 'root' ? (activeProject?.name ?? 'Référentiel') : resource.name}</Typography>
        <Typography level="body-sm" color="neutral">Chargement du contenu…</Typography>
      </Card>
    );
  }

  if (resources.isError) {
    return (
      <Card variant="outlined" sx={{ flex: 1, minHeight: 220, gap: 1 }}>
        <Typography level="title-lg">{resourceId === 'root' ? (activeProject?.name ?? 'Référentiel') : resource.name}</Typography>
        <Typography level="body-sm" color="danger">
          Impossible de charger le contenu de ce répertoire.
        </Typography>
      </Card>
    );
  }

  if (resourceId === 'root' && activeProject) {
    const rootFolders = children.filter(child => child.type === ResourceType.Folder);
    return (
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        <Card variant="outlined" sx={{ gap: 0.75 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography level="title-lg">{activeProject.name}</Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Button
                size="sm"
                variant="outlined"
                color="neutral"
                onClick={() => navigate(`/projects/${activeProjectId}`)}
              >
                Paramètres du projet
              </Button>
              {activeProject.role === 'admin' && !editingDescription && (
                <IconButton
                  size="sm"
                  variant="plain"
                  color="neutral"
                  aria-label="Modifier la description du projet"
                  title="Modifier la description"
                  onClick={() => {
                    setDescriptionDraft(activeProject.description ?? '');
                    setDescriptionError(null);
                    setEditingDescription(true);
                  }}
                >
                  <EditRounded />
                </IconButton>
              )}
            </Stack>
          </Stack>
          {editingDescription ? (
            <Stack spacing={1}>
              <Textarea
                minRows={3}
                value={descriptionDraft}
                onChange={event => setDescriptionDraft(event.target.value)}
                placeholder="Décrivez les objectifs et le périmètre du projet"
                aria-label="Description du projet"
              />
              {descriptionError && <Alert color="danger">{descriptionError}</Alert>}
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
                    setDescriptionDraft(activeProject.description ?? '');
                    setEditingDescription(false);
                  }}
                >
                  Annuler
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  borderRadius: '5px',
                  bgcolor: activeProject.color || '#2864d7',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Typography level="title-md">{projectIconLabels[activeProject.icon] || '📁'}</Typography>
              <Typography level="body-sm" color="neutral" sx={{ whiteSpace: 'pre-wrap' }}>
                {activeProject.description?.trim() || 'Espace de travail du projet actif.'}
              </Typography>
            </Stack>
          )}
          <Chip variant="soft">{activeProject.processes.length} processus associés</Chip>
        </Card>
        {activeProject.processes.length > 0 ? (
          <ProjectProcessOverview
            processes={activeProject.processes.map(process => ({
              resourceId: process.resourceId,
              name: process.name,
              usage: process.usage,
            }))}
          />
        ) : (
          <Card variant="outlined">
            <Typography level="title-md">Aucun processus associé</Typography>
            <Typography level="body-sm" color="neutral">Ajoutez des processus au projet depuis son administration ou créez-en un depuis le Viewer.</Typography>
          </Card>
        )}
        {rootFolders.length > 0 && (
          <Card variant="outlined" sx={{ gap: 1 }}>
            <Typography level="title-lg">Répertoires du projet</Typography>
            <Stack spacing={0.75}>
              {rootFolders.map(folder => (
                <Button key={folder.id} variant="outlined" color="neutral" startDecorator={<FolderOutlined />} onClick={() => navigate(`/${folder.id}`)} sx={{ justifyContent: 'flex-start' }}>
                  {folder.name}
                </Button>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        minHeight: 220,
        gap: 1.5,
        overflow: 'auto',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography level="title-lg">{resourceId === 'root' ? (activeProject?.name ?? 'Référentiel') : resource.name}</Typography>
          <Typography level="body-sm" color="neutral" sx={{ whiteSpace: 'pre-wrap' }}>
            {(resourceId === 'root' ? activeProject?.description : resource.description)?.trim() || (resourceId === 'root' ? 'Sélectionnez un projet pour afficher son espace de travail.' : 'Aucun descriptif renseigné pour ce répertoire.')}
          </Typography>
          <Typography level="body-sm" color="neutral">
            Sélectionnez un sous-répertoire ou un processus pour l’ouvrir.
          </Typography>
        </Box>
        <Chip variant="soft">{children.length} élément(s)</Chip>
      </Stack>

      {!activeProjectId && (
        <Box sx={{ flex: 1, minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 3 }}>
          <Typography level="body-sm" color="neutral">Sélectionnez un projet pour afficher ses processus.</Typography>
        </Box>
      )}
      {activeProjectId && children.length === 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Stack spacing={0.75} alignItems="center">
            <FolderOutlined sx={{ fontSize: 36, color: 'text.tertiary' }} />
            <Typography level="title-md">Répertoire vide</Typography>
            <Typography level="body-sm" color="neutral">
              Aucun sous-répertoire ni processus n’est associé à ce répertoire.
            </Typography>
          </Stack>
        </Box>
      )}
      {activeProjectId && children.length > 0 && (
        <Stack spacing={0.75}>
          {children.map((childResource: Resource) => {
            const isFolder = childResource.type === ResourceType.Folder;
            return (
              <Button
                key={childResource.id}
                variant="outlined"
                color="neutral"
                onClick={() => navigate(`/${childResource.id}`)}
                startDecorator={isFolder ? <FolderOutlined /> : <DescriptionOutlined />}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  minHeight: 44,
                  px: 1.25,
                  gap: 1,
                  borderColor: 'neutral.outlinedBorder',
                  '&:hover': { bgcolor: 'background.level1' },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography level="title-sm" noWrap>
                    {childResource.name}
                  </Typography>
                  <Typography level="body-xs" color="neutral">
                    {isFolder ? 'Répertoire' : 'Processus'}
                  </Typography>
                </Box>
              </Button>
            );
          })}
        </Stack>
      )}
    </Card>
  );
};
