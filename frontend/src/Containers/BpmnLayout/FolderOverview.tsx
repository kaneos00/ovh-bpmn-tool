import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Typography,
} from '@mui/joy';
import { DescriptionOutlined, FolderOutlined } from '@mui/icons-material';

import { resourcesQuery } from '../../api/resources/resources.queries';
import { useActiveProject } from '../../shared/hooks/useActiveProject';
import { ProjectProcessOverview } from '../ProjectViewer/ProjectProcessOverview';
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';

type FolderOverviewProps = {
  resource: Resource;
};

export const FolderOverview = ({ resource }: FolderOverviewProps) => {
  const { id: resourceId } = resource;
  const navigate = useNavigate();
  const resources = useQuery<Resource[]>(resourcesQuery());
  const { activeProject, activeProjectId, projectProcessIds } = useActiveProject();

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
          <Typography level="title-lg">{activeProject.name}</Typography>
          <Typography level="body-sm" color="neutral" sx={{ whiteSpace: 'pre-wrap' }}>
            {activeProject.description?.trim() || 'Espace de travail du projet actif.'}
          </Typography>
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
