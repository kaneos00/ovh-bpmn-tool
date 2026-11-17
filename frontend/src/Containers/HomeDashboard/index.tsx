import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, Chip, Input, Stack, Typography } from '@mui/joy';
import { Search } from '@mui/icons-material';
import { WorkspacePageLayout } from '../../Components/GenericComponents/WorkspacePageLayout/WorkspacePageLayout';
import { useActiveProject } from '../../shared/hooks/useActiveProject';

const roleLabels = {
  viewer: 'Consultation',
  modeler: 'Modélisation',
  admin: 'Administration du projet',
} as const;

export const Component = () => {
  const navigate = useNavigate();
  const { projects, activeProject, activeProjectId, setActiveProject, isLoading, isError } = useActiveProject();
  const [search, setSearch] = useState('');
  const actionProject = activeProject ?? projects[0] ?? null;

  const openExplorer = (projectId: string) => {
    setActiveProject(projectId);
    navigate('/root');
  };

  const openResponsibilities = (projectId: string) => {
    navigate(`/projects/${projectId}?tab=raci`);
  };

  const submitSearch = () => {
    const query = search.trim();
    if (query.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <WorkspacePageLayout>
      <Stack spacing={3} sx={{ maxWidth: 1440, mx: 'auto', py: { xs: 1, md: 3 } }}>
        <Box>
          <Typography level="h1" sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>
            Mon espace
          </Typography>
          <Typography level="body-md" color="neutral">
            Retrouvez vos projets, vos responsabilités et les processus auxquels vous avez accès.
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, gap: 2 }}>
          <Typography level="title-lg">Accès rapide</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <Button
              size="lg"
              variant="solid"
              disabled={!actionProject}
              onClick={() => actionProject && openResponsibilities(actionProject.id)}
              sx={{ minHeight: 76, justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left', px: 2 }}
            >
              <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                <Typography level="title-md" sx={{ color: 'inherit' }}>Mes responsabilités</Typography>
                <Typography level="body-xs" sx={{ color: 'inherit', opacity: 0.8 }}>Consulter le RACI du projet sélectionné</Typography>
              </Stack>
            </Button>
            <Button
              size="lg"
              variant="soft"
              color="primary"
              disabled={!actionProject}
              onClick={() => actionProject && openExplorer(actionProject.id)}
              sx={{ minHeight: 76, justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left', px: 2 }}
            >
              <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                <Typography level="title-md">Explorer les processus</Typography>
                <Typography level="body-xs">Ouvrir l’espace de travail du projet sélectionné</Typography>
              </Stack>
            </Button>
          </Box>
          {!actionProject && !isLoading && (
            <Typography level="body-sm" color="neutral">
              Aucun projet ne vous est actuellement attribué.
            </Typography>
          )}
        </Card>

        <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, gap: 1.5 }}>
          <Typography level="title-lg">Rechercher</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Input
              size="lg"
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') submitSearch(); }}
              placeholder="Rechercher un processus, un rôle, une information documentée…"
              startDecorator={<Search />}
              sx={{ flex: 1 }}
              aria-label="Recherche globale"
            />
            <Button size="lg" disabled={search.trim().length < 2} onClick={submitSearch}>
              Rechercher
            </Button>
          </Stack>
        </Card>

        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography level="title-lg">Mes projets</Typography>
            <Button variant="plain" size="sm" onClick={() => navigate('/projects')}>Tous les projets</Button>
          </Stack>
          {isLoading && <Typography level="body-sm" color="neutral">Chargement de vos projets…</Typography>}
          {isError && <Alert color="danger">Impossible de charger les projets accessibles.</Alert>}
          {!isLoading && !isError && projects.length === 0 && (
            <Card variant="soft">
              <Typography level="body-sm">Aucun projet n’est associé à votre compte pour le moment.</Typography>
            </Card>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {projects.map(project => (
              <Card key={project.id} variant="outlined" sx={{ gap: 1.25, borderColor: project.id === activeProjectId ? 'primary.500' : 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography level="title-md">{project.name}</Typography>
                  {project.id === activeProjectId && <Chip size="sm" color="primary" variant="soft">Projet actif</Chip>}
                </Stack>
                {project.description && <Typography level="body-sm" color="neutral">{project.description}</Typography>}
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="sm" variant="outlined">{roleLabels[project.role]}</Chip>
                  <Chip size="sm" variant="outlined">{project.processes.length} processus</Chip>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button size="sm" onClick={() => openExplorer(project.id)}>Explorer</Button>
                  <Button size="sm" variant="outlined" color="neutral" onClick={() => openResponsibilities(project.id)}>RACI</Button>
                </Stack>
              </Card>
            ))}
          </Box>
        </Stack>
      </Stack>
    </WorkspacePageLayout>
  );
};

Component.displayName = 'HomeDashboardContainer';
