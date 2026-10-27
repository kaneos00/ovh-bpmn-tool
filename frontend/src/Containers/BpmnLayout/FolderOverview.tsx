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
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';

type FolderOverviewProps = {
  resourceId: string;
};

export const FolderOverview = ({ resourceId }: FolderOverviewProps) => {
  const navigate = useNavigate();
  const resources = useQuery<Resource[]>(resourcesQuery());

  const children = useMemo(() => {
    return (resources.data ?? [])
      .filter(resource => (resource.parentId ?? 'root') === resourceId)
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === ResourceType.Folder ? -1 : 1;
        }
        return left.name.localeCompare(right.name, 'fr');
      });
  }, [resources.data, resourceId]);

  if (resources.isLoading) {
    return (
      <Card variant="outlined" sx={{ flex: 1, minHeight: 220, gap: 1 }}>
        <Typography level="title-lg">Contenu du répertoire</Typography>
        <Typography level="body-sm" color="neutral">Chargement du contenu…</Typography>
      </Card>
    );
  }

  if (resources.isError) {
    return (
      <Card variant="outlined" sx={{ flex: 1, minHeight: 220, gap: 1 }}>
        <Typography level="title-lg">Contenu du répertoire</Typography>
        <Typography level="body-sm" color="danger">
          Impossible de charger le contenu de ce répertoire.
        </Typography>
      </Card>
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
          <Typography level="title-lg">Contenu du répertoire</Typography>
          <Typography level="body-sm" color="neutral">
            Sélectionnez un sous-répertoire ou un processus pour l’ouvrir.
          </Typography>
        </Box>
        <Chip variant="soft">{children.length} élément(s)</Chip>
      </Stack>

      {children.length === 0 ? (
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
      ) : (
        <Stack spacing={0.75}>
          {children.map((resource: Resource) => {
            const isFolder = resource.type === ResourceType.Folder;
            return (
              <Button
                key={resource.id}
                variant="outlined"
                color="neutral"
                onClick={() => navigate(`/${resource.id}`)}
                startDecorator={isFolder
                  ? <FolderOutlined />
                  : <DescriptionOutlined />}
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
                    {resource.name}
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
