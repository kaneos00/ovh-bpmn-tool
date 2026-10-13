import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Alert, Box, Button, Card, Chip, Sheet, Stack, Typography } from '@mui/joy';
import { apiClient } from '../../queryClient';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';

type WorkspaceProcess = {
  resourceId: string;
  name: string;
  usage: 'common' | 'variant' | 'project-specific';
  sourceResourceId: string | null;
};
type WorkspaceProject = {
  id: string;
  name: string;
  description: string | null;
  role: 'viewer' | 'modeler' | 'admin';
  processes: WorkspaceProcess[];
};
type Workspace = { userId: string; projects: WorkspaceProject[] };

const roleLabels: Record<WorkspaceProject['role'], string> = {
  viewer: 'Consultation',
  modeler: 'Modélisation',
  admin: 'Administration du projet',
};
const roleColors: Record<WorkspaceProject['role'], 'warning' | 'primary' | 'neutral'> = {
  viewer: 'neutral',
  modeler: 'primary',
  admin: 'warning',
};
const usageLabels: Record<WorkspaceProcess['usage'], string> = {
  common: 'communs',
  variant: 'variantes',
  'project-specific': 'spécifiques',
};

export const Component = () => {
  const navigate = useNavigate();
  const workspaceQuery = useQuery<Workspace>(
    ['my-workspace'],
    () => apiClient.get('/projects/me/workspace'),
  );
  const workspace = workspaceQuery.data;

  return (
    <Sheet sx={{ width: '100%', maxWidth: 1400, boxSizing: 'border-box', mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Stack spacing={2}>
        <WorkspaceNavigation />
        <Box>
          <Typography level="h2">Mon espace de travail</Typography>
          <Typography level="body-md" sx={{ mt: 0.5 }}>
            Retrouvez les projets auxquels vous avez accès, votre rôle et les processus associés.
          </Typography>
        </Box>
        {workspaceQuery.isLoading && <Typography>Chargement de votre espace…</Typography>}
        {workspaceQuery.isError && (
          <Alert color="danger">Impossible de charger votre espace. Vérifiez votre connexion ou vos droits d’accès.</Alert>
        )}
        {workspace && workspace.projects.length === 0 && !workspaceQuery.isLoading && (
          <Card variant="outlined" sx={{ gap: 1 }}>
            <Typography level="title-lg">Aucun projet accessible pour le moment</Typography>
            <Typography level="body-sm">Lorsqu’un administrateur vous ajoutera à un projet, celui-ci apparaîtra ici.</Typography>
            <Button variant="soft" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/root')}>
              Parcourir le référentiel BPMN
            </Button>
          </Card>
        )}
        <Stack spacing={1.5}>
          {(workspace?.projects ?? []).map((project) => {
            const counts = {
              common: project.processes.filter((process) => process.usage === 'common').length,
              variant: project.processes.filter((process) => process.usage === 'variant').length,
              specific: project.processes.filter((process) => process.usage === 'project-specific').length,
            };
            return (
              <Card key={project.id} variant="outlined" sx={{ gap: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="title-lg">{project.name}</Typography>
                    {project.description && <Typography level="body-sm">{project.description}</Typography>}
                  </Box>
                  <Chip color={roleColors[project.role]} variant="soft">
                    {roleLabels[project.role]}
                  </Chip>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip variant="outlined">{project.processes.length} processus</Chip>
                  <Chip variant="outlined">{counts.common} commun(s)</Chip>
                  <Chip variant="outlined">{counts.variant} variante(s)</Chip>
                  <Chip variant="outlined">{counts.specific} spécifique(s)</Chip>
                </Stack>
                {project.processes.length > 0 && (
                  <Box>
                    <Typography level="title-sm">Processus associés</Typography>
                    <Typography level="body-sm" sx={{ mt: 0.5 }}>
                      {project.processes.slice(0, 4).map((process) => `${process.name} (${usageLabels[process.usage]})`).join(' · ')}
                      {project.processes.length > 4 ? ` · +${project.processes.length - 4} autre(s)` : ''}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Button onClick={() => navigate(`/projects/${project.id}`)}>Ouvrir le projet</Button>
                </Box>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'MyWorkspaceContainer';
