import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, Chip, Divider, Sheet, Stack, Typography } from '@mui/joy';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { useActiveProject } from '../../shared/hooks/useActiveProject';

const iconLabels: Record<string, string> = {
  folder: '📁',
  briefcase: '💼',
  building: '🏢',
  workflow: '🔀',
  users: '👥',
  chart: '📊',
};

const roleLabels = {
  viewer: 'Consultazione',
  modeler: 'Modellazione',
  admin: 'Amministrazione del progetto',
} as const;

export const Component = () => {
  const navigate = useNavigate();
  const { projects, activeProject, setActiveProject, isLoading, isError } = useActiveProject();

  const summary = useMemo(() => {
    const linked = projects.flatMap(project => project.processes);
    return {
      projects: projects.length,
      processes: new Set(linked.map(process => process.resourceId)).size,
      common: linked.filter(process => process.usage === 'common').length,
      adapted: linked.filter(process => process.usage === 'variant' || process.usage === 'project-specific').length,
    };
  }, [projects]);

  const openProject = (projectId: string) => {
    setActiveProject(projectId);
    navigate('/root');
  };

  return (
    <Sheet sx={{ width: '100%', maxWidth: 1440, boxSizing: 'border-box', mx: 'auto', p: { xs: 1, md: 2 }, bgcolor: 'transparent' }}>
      <Stack spacing={2.5}>
        <WorkspaceNavigation />
        <Box>
          <Typography level="h1" fontSize="xl4">Accueil</Typography>
          <Typography level="body-md" color="neutral">
            Retrouvez vos projets, leur périmètre et vos accès depuis un seul espace.
          </Typography>
        </Box>

        {activeProject && (
          <Card variant="soft" color="primary" sx={{ gap: 1 }}>
            <Typography level="title-sm">Projet actif</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: activeProject.color || '#2864d7' }} />
                <Typography level="title-lg">{activeProject.name}</Typography>
              </Stack>
              <Button size="sm" onClick={() => navigate('/root')}>Reprendre le référentiel</Button>
            </Stack>
          </Card>
        )}

        <Box>
          <Typography level="title-lg" sx={{ mb: 1.25 }}>Vue d’ensemble</Typography>
          {isLoading ? (
            <Typography level="body-sm" color="neutral">Chargement de vos projets…</Typography>
          ) : isError ? (
            <Alert color="danger">Impossible de charger votre espace de travail. Réessayez dans quelques instants.</Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
              {[
                { label: 'Projets accessibles', value: summary.projects },
                { label: 'Processus distincts', value: summary.processes },
                { label: 'Associations communes', value: summary.common },
                { label: 'Variantes et spécifiques', value: summary.adapted },
              ].map(item => (
                <Card key={item.label} variant="outlined" sx={{ gap: 0.5 }}>
                  <Typography level="body-sm" color="neutral">{item.label}</Typography>
                  <Typography level="h2" fontSize="xl3">{item.value}</Typography>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography level="title-lg">Mes projets</Typography>
            <Typography level="body-sm" color="neutral">Ouvrez un projet pour accéder à son référentiel.</Typography>
          </Box>
          <Button variant="outlined" color="neutral" onClick={() => navigate('/projects')}>Voir la gestion des projets</Button>
        </Stack>

        {!isLoading && !isError && projects.length === 0 && (
          <Card variant="outlined">
            <Typography level="title-md">Aucun projet accessible</Typography>
            <Typography level="body-sm" color="neutral">Vous n’êtes actuellement membre d’aucun projet. Contactez un administrateur pour obtenir un accès.</Typography>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
          {projects.map(project => {
            const commonCount = project.processes.filter(process => process.usage === 'common').length;
            const adaptedCount = project.processes.filter(process => process.usage !== 'common').length;
            return (
              <Card key={project.id} variant="outlined" sx={{ gap: 1.25 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box sx={{ width: 42, height: 42, borderRadius: 'md', bgcolor: project.color || '#2864d7', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20 }}>
                    {iconLabels[project.icon] || '📁'}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography level="title-lg">{project.name}</Typography>
                    <Typography level="body-xs" color="neutral">{roleLabels[project.role]}</Typography>
                  </Box>
                  {activeProject?.id === project.id && <Chip size="sm" color="primary">Actif</Chip>}
                </Stack>
                <Typography level="body-sm" sx={{ minHeight: 40 }}>
                  {project.description?.trim() || 'Aucune description renseignée.'}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="sm" variant="outlined">{project.processes.length} associations</Chip>
                  <Chip size="sm" variant="soft" color="success">{commonCount} communs</Chip>
                  <Chip size="sm" variant="soft" color="warning">{adaptedCount} adaptés</Chip>
                </Stack>
                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button sx={{ flex: 1 }} onClick={() => openProject(project.id)}>Ouvrir le projet</Button>
                  {project.role === 'admin' && (
                    <Button variant="outlined" color="neutral" onClick={() => navigate(`/projects/${project.id}`)}>
                      Paramètres et couleur
                    </Button>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'HomeContainer';
