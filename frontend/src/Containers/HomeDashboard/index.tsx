import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Card, Divider, Input, Stack, Typography } from '@mui/joy';
import {
  AddCircleOutline,
  AssignmentTurnedInOutlined,
  BadgeOutlined,
  FolderOpenOutlined,
  Search,
  SchemaOutlined,
} from '@mui/icons-material';
import { WorkspacePageLayout } from '../../Components/GenericComponents/WorkspacePageLayout/WorkspacePageLayout';
import { useActiveProject } from '../../shared/hooks/useActiveProject';
import { apiClient } from '../../queryClient';

type QuickAction = {
  label: string;
  description: string;
  Icon: typeof AssignmentTurnedInOutlined;
  run: (navigate: ReturnType<typeof useNavigate>, projectId: string | null, setActiveProject: (id: string) => void, toggleJobPosition: () => void) => void;
};

type MyJobPosition = {
  position: { id: string; title: string; description?: string | null };
  function: { id: string; code: string; name: string; description?: string | null };
  document?: {
    mission?: string | null;
    reportingLine?: string | null;
    otherTitles?: string[];
    documentDate?: string | null;
    documentVersion?: string | null;
    establishedBy?: string | null;
    validatedBy?: string | null;
    activitySections?: Array<{ id: string; code: string; title: string; tasks: string[] }>;
    customSections?: Array<{ id: string; title: string; content: Record<string, unknown> }>;
  };
};

const quickActions: QuickAction[] = [
  {
    label: 'Mes responsabilités',
    description: 'Consulter le RACI',
    Icon: AssignmentTurnedInOutlined,
    run: (navigate, projectId) => {
      if (projectId) navigate(`/projects/${projectId}?tab=raci`);
    },
  },
  {
    label: 'Explorer les processus',
    description: 'Ouvrir l’espace de travail',
    Icon: SchemaOutlined,
    run: (navigate, projectId, setActiveProject) => {
      if (projectId) {
        setActiveProject(projectId);
        navigate('/root');
      }
    },
  },
  {
    label: 'Créer un processus',
    description: 'Démarrer une modélisation',
    Icon: AddCircleOutline,
    run: (navigate, projectId) => {
      if (projectId) navigate(`/root/add?type=process&projectId=${encodeURIComponent(projectId)}`);
    },
  },
  {
    label: 'Ma fiche de poste',
    description: 'Consulter mon poste dans le projet actif',
    Icon: BadgeOutlined,
    run: (_navigate, _projectId, _setActiveProject, toggleJobPosition) => toggleJobPosition(),
  },
];

export const Component = () => {
  const navigate = useNavigate();
  const { projects, activeProject, activeProjectId, setActiveProject, isLoading, isError } = useActiveProject();
  const [search, setSearch] = useState('');
  const [showJobPosition, setShowJobPosition] = useState(false);
  const jobPositionQuery = useQuery<MyJobPosition | null>(
    ['my-job-position', activeProjectId],
    () => apiClient.get(`/projects/${activeProjectId}/my-job-position`),
    { enabled: Boolean(activeProjectId && showJobPosition), staleTime: 60_000 },
  );
  const actionProject = activeProject ?? projects[0] ?? null;
  const canCreateProcess = actionProject?.role === 'admin' || actionProject?.role === 'modeler';

  const submitSearch = () => {
    const query = search.trim();
    if (query.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <WorkspacePageLayout>
      <Stack
        spacing={{ xs: 3, md: 4 }}
        sx={{
          width: '100%',
          maxWidth: 1160,
          mx: 'auto',
          py: { xs: 3, md: 7 },
          px: { xs: 0, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
            gap: { xs: 1.5, sm: 2.5 },
            maxWidth: 900,
            width: '100%',
            mx: 'auto',
          }}
        >
          {quickActions.map(({ label, description, Icon, run }) => {
            const disabled = !actionProject
              || (label === 'Ma fiche de poste' && !activeProjectId)
              || (label === 'Créer un processus' && !canCreateProcess);
            return (
              <Card
                key={label}
                variant="outlined"
                component="button"
                type="button"
                disabled={disabled}
                onClick={() => run(navigate, actionProject?.id ?? null, setActiveProject, () => setShowJobPosition(value => !value))}
                sx={{
                  aspectRatio: '1 / 1',
                  minWidth: 0,
                  p: { xs: 1.5, sm: 2 },
                  gap: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  borderRadius: 'xl',
                  borderColor: 'neutral.outlinedBorder',
                  bgcolor: 'background.surface',
                  transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                  '&:hover': disabled ? {} : {
                    borderColor: 'primary.400',
                    boxShadow: 'md',
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 54, sm: 68 },
                    height: { xs: 54, sm: 68 },
                    borderRadius: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.softBg',
                    color: 'primary.600',
                  }}
                >
                  <Icon sx={{ fontSize: { xs: 34, sm: 42 } }} />
                </Box>
                <Typography level="title-md" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {label}
                </Typography>
                <Typography level="body-xs" color="neutral" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {description}
                </Typography>
              </Card>
            );
          })}
        </Box>

        {showJobPosition && (
          <Card variant="outlined" sx={{ width: '100%', maxWidth: 900, mx: 'auto', borderRadius: 'xl', p: { xs: 2, sm: 3 } }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography level="title-lg" sx={{ fontWeight: 700 }}>Ma fiche de poste</Typography>
                <Typography level="body-xs" color="neutral">Projet : {actionProject?.name ?? 'Aucun projet actif'}</Typography>
              </Box>
              {jobPositionQuery.isLoading && <Typography level="body-sm" color="neutral">Chargement de votre fiche…</Typography>}
              {jobPositionQuery.isError && <Alert color="danger">Impossible de charger votre fiche de poste.</Alert>}
              {jobPositionQuery.isSuccess && !jobPositionQuery.data && (
                <Alert color="neutral">Aucun poste ne vous est affecté dans ce projet.</Alert>
              )}
              {jobPositionQuery.data && (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography level="title-md" sx={{ fontWeight: 700 }}>{jobPositionQuery.data.position.title}</Typography>
                    <Typography level="body-sm" color="neutral">{jobPositionQuery.data.function.name} · {jobPositionQuery.data.function.code}</Typography>
                    {jobPositionQuery.data.position.description && <Typography level="body-sm">{jobPositionQuery.data.position.description}</Typography>}
                  </Box>
                  {jobPositionQuery.data.document?.mission && (
                    <Box>
                      <Typography level="title-sm">Mission</Typography>
                      <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{jobPositionQuery.data.document.mission}</Typography>
                    </Box>
                  )}
                  {(jobPositionQuery.data.document?.reportingLine || jobPositionQuery.data.document?.otherTitles?.length) && (
                    <Typography level="body-sm" color="neutral">
                      {jobPositionQuery.data.document.reportingLine ? `Rattachement : ${jobPositionQuery.data.document.reportingLine}` : ''}
                      {jobPositionQuery.data.document.otherTitles?.length ? ` · Autres intitulés : ${jobPositionQuery.data.document.otherTitles.join(', ')}` : ''}
                    </Typography>
                  )}
                  {jobPositionQuery.data.document?.activitySections?.map(section => (
                    <Box key={section.id}>
                      <Divider sx={{ mb: 1 }} />
                      <Typography level="title-sm">{section.code} — {section.title}</Typography>
                      <Stack component="ul" spacing={0.5} sx={{ my: 0, pl: 2.5 }}>
                        {section.tasks.map((task, index) => <Typography component="li" level="body-sm" key={index}>{task}</Typography>)}
                      </Stack>
                    </Box>
                  ))}
                  {jobPositionQuery.data.document?.customSections?.map(section => (
                    <Box key={section.id}>
                      <Divider sx={{ mb: 1 }} />
                      <Typography level="title-sm">{section.title}</Typography>
                      <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(section.content, null, 2)}</Typography>
                    </Box>
                  ))}
                  {(jobPositionQuery.data.document?.documentVersion || jobPositionQuery.data.document?.documentDate || jobPositionQuery.data.document?.establishedBy || jobPositionQuery.data.document?.validatedBy) && (
                    <Typography level="body-xs" color="neutral">
                      {[jobPositionQuery.data.document.documentVersion, jobPositionQuery.data.document.documentDate, jobPositionQuery.data.document.establishedBy ? `Établie par ${jobPositionQuery.data.document.establishedBy}` : '', jobPositionQuery.data.document.validatedBy ? `Validée par ${jobPositionQuery.data.document.validatedBy}` : ''].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
          <Input
            size="lg"
            value={search}
            onChange={event => setSearch(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') submitSearch(); }}
            placeholder="Rechercher un processus, un rôle, une information documentée…"
            startDecorator={<Search />}
            endDecorator={(
              <Typography
                level="body-xs"
                color="neutral"
                sx={{ whiteSpace: 'nowrap', cursor: search.trim().length >= 2 ? 'pointer' : 'default' }}
                onClick={submitSearch}
              >
                Rechercher ↵
              </Typography>
            )}
            sx={{
              minHeight: 58,
              borderRadius: 'xl',
              bgcolor: 'background.surface',
              boxShadow: 'sm',
              '--Input-focusedThickness': '2px',
              fontSize: 'md',
            }}
            aria-label="Recherche globale"
          />
        </Box>

        <Box sx={{ width: '100%' }}>
          <Typography level="title-lg" sx={{ mb: 2, fontWeight: 700 }}>
            Mes projets
          </Typography>
          {isLoading && <Typography level="body-sm" color="neutral">Chargement…</Typography>}
          {isError && <Alert color="danger">Impossible de charger les projets accessibles.</Alert>}
          {!isLoading && !isError && projects.length === 0 && (
            <Typography level="body-sm" color="neutral">
              Aucun projet ne vous est actuellement attribué.
            </Typography>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {projects.map(project => (
              <Card
                key={project.id}
                component="button"
                type="button"
                variant="outlined"
                onClick={() => {
                  setActiveProject(project.id);
                  navigate('/root');
                }}
                sx={{
                  aspectRatio: '1 / 1',
                  minWidth: 0,
                  p: 2,
                  gap: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  borderRadius: 'xl',
                  borderWidth: project.id === activeProjectId ? 2 : 1,
                  borderColor: project.id === activeProjectId ? 'primary.500' : 'neutral.outlinedBorder',
                  bgcolor: project.id === activeProjectId ? 'primary.softBg' : 'background.surface',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { boxShadow: 'md', transform: 'translateY(-2px)' },
                }}
              >
                <Box
                  sx={{
                    width: 58,
                    height: 58,
                    borderRadius: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'neutral.softBg',
                    color: 'neutral.700',
                  }}
                >
                  <FolderOpenOutlined sx={{ fontSize: 36 }} />
                </Box>
                <Typography level="title-md" sx={{ fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                  {project.name}
                </Typography>
                {project.id === activeProjectId && (
                  <Typography level="body-xs" color="primary" sx={{ fontWeight: 600 }}>
                    Projet actif
                  </Typography>
                )}
              </Card>
            ))}
          </Box>
        </Box>
      </Stack>
    </WorkspacePageLayout>
  );
};

Component.displayName = 'HomeDashboardContainer';
