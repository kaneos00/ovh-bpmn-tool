import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Card, Divider, Input, List, Option, Select, Sheet, Stack, Typography } from '@mui/joy';
import {
  AssignmentTurnedInOutlined,
  BadgeOutlined,
  FolderOpenOutlined,
  Search,
  SchemaOutlined,
} from '@mui/icons-material';
import { WorkspacePageLayout } from '../../Components/GenericComponents/WorkspacePageLayout/WorkspacePageLayout';
import { useActiveProject } from '../../shared/hooks/useActiveProject';
import { apiClient } from '../../queryClient';
import { unifiedSearchQuery, type UnifiedSearchType } from '../../api/search/search.queries';
import { SearchResultItem } from '../../Components/GenericComponents/SearchResultItem/SearchResultItem';

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
  const [searchScope, setSearchScope] = useState<'all' | 'process' | 'bpmn' | 'actor' | 'raci' | 'documented'>('all');
  const [recentPages, setRecentPages] = useState<Array<{ href: string; label: string; visitedAt: number }>>([]);
  const [showJobPosition, setShowJobPosition] = useState(false);
  const searchTypes: Partial<Record<typeof searchScope, UnifiedSearchType>> = {
    process: 'process', bpmn: 'bpmn', actor: 'actor', raci: 'raci', documented: 'documented',
  };
  const homeSearchOptions = unifiedSearchQuery({
    q: search.trim(),
    types: searchTypes[searchScope] ? [searchTypes[searchScope]!] : undefined,
    projectId: activeProjectId ?? undefined,
    limit: 10,
    offset: 0,
  });
  const homeSearchQuery = useQuery(
    homeSearchOptions.queryKey,
    homeSearchOptions.queryFn,
    { enabled: search.trim().length >= 2, keepPreviousData: true },
  );
  useEffect(() => {
    const loadRecent = () => {
      try {
        const saved = JSON.parse(window.localStorage.getItem('khi-flows-recent-pages') || '[]');
        if (Array.isArray(saved)) setRecentPages(saved.slice(0, 10));
      } catch {
        setRecentPages([]);
      }
    };
    loadRecent();
    window.addEventListener('khi-recent-pages-updated', loadRecent);
    return () => window.removeEventListener('khi-recent-pages-updated', loadRecent);
  }, []);
  const jobPositionQuery = useQuery<MyJobPosition | null>(
    ['my-job-position', activeProjectId],
    () => apiClient.get(`/projects/${activeProjectId}/my-job-position`),
    { enabled: Boolean(activeProjectId && showJobPosition), staleTime: 60_000 },
  );
  const actionProject = activeProject ?? projects[0] ?? null;

  const submitSearch = () => {
    const query = search.trim();
    if (query.length < 2) return;
    const params = new URLSearchParams({ q: query });
    if (searchScope !== 'all') params.set('types', searchScope);
    if (activeProjectId) params.set('projectId', activeProjectId);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <WorkspacePageLayout>
      <Stack
        spacing={{ xs: 3, md: 4 }}
        sx={{
          width: '100%',
          maxWidth: 1160,
          mx: 'auto',
          py: { xs: 3, md: 4 },
          minHeight: 'calc(100vh - 112px)',
          justifyContent: 'center',
          px: { xs: 0, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
            gap: { xs: 1.5, sm: 2.5 },
            maxWidth: 780,
            width: '100%',
            mx: 'auto',
          }}
        >
          {quickActions.map(({ label, description, Icon, run }) => {
            const disabled = !actionProject || (label === 'Ma fiche de poste' && !activeProjectId);
            let tileStyle = { background: '#fff2df', foreground: '#9a5a12', border: '#f1d6aa' };
            if (label === 'Mes responsabilités') {
              tileStyle = { background: '#e9f2ff', foreground: '#2459a6', border: '#c7dcfa' };
            } else if (label === 'Explorer les processus') {
              tileStyle = { background: '#e8f6f1', foreground: '#18745c', border: '#bfe7d8' };
            }
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
                  borderColor: tileStyle.border,
                  bgcolor: tileStyle.background,
                  transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                  '&:hover': disabled ? {} : {
                    borderColor: tileStyle.foreground,
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
                    bgcolor: '#ffffff',
                    color: tileStyle.foreground,
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
                      {jobPositionQuery.data.document?.reportingLine ? `Rattachement : ${jobPositionQuery.data.document.reportingLine}` : ''}
                      {jobPositionQuery.data.document?.otherTitles?.length ? ` · Autres intitulés : ${jobPositionQuery.data.document.otherTitles.join(', ')}` : ''}
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
                      {[jobPositionQuery.data.document?.documentVersion, jobPositionQuery.data.document?.documentDate, jobPositionQuery.data.document?.establishedBy ? `Établie par ${jobPositionQuery.data.document.establishedBy}` : '', jobPositionQuery.data.document?.validatedBy ? `Validée par ${jobPositionQuery.data.document.validatedBy}` : ''].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', position: 'relative' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Select
              size="lg"
              value={searchScope}
              onChange={(_, value) => { if (value) setSearchScope(value as typeof searchScope); }}
              aria-label="Type de recherche"
              sx={{ minWidth: { xs: '100%', sm: 220 }, borderRadius: 'xl', bgcolor: 'background.surface' }}
            >
              <Option value="all">Tout rechercher</Option>
              <Option value="process">Processus</Option>
              <Option value="bpmn">Éléments BPMN</Option>
              <Option value="actor">Rôles</Option>
              <Option value="raci">RACI</Option>
              <Option value="documented">Informations documentées</Option>
            </Select>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Input
                size="lg"
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') submitSearch(); }}
                onFocus={() => undefined}
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
          </Stack>
          {search.trim().length >= 2 && (
            <Sheet
              variant="outlined"
              sx={{ position: 'absolute', top: 'calc(100% + 6px)', left: { xs: 0, sm: 228 }, right: 0, zIndex: 1500, borderRadius: 'md', maxHeight: 'min(55vh, 480px)', overflowY: 'auto', bgcolor: 'background.surface', boxShadow: 'lg' }}
            >
              <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography level="body-xs" color="neutral">Suggestions de la recherche rapide</Typography>
              </Box>
              {homeSearchQuery.isLoading && <Typography level="body-sm" sx={{ p: 1.5 }}>Recherche en cours…</Typography>}
              {homeSearchQuery.isError && <Typography level="body-sm" color="danger" sx={{ p: 1.5 }}>Recherche indisponible pour le moment.</Typography>}
              {!homeSearchQuery.isLoading && !homeSearchQuery.isError && (homeSearchQuery.data?.results ?? []).length === 0 && (
                <Typography level="body-sm" color="neutral" sx={{ p: 1.5 }}>Aucune suggestion pour cette recherche.</Typography>
              )}
              {(homeSearchQuery.data?.results ?? []).map(result => {
                const detailByType: Record<UnifiedSearchType, string> = {
                  process: 'Processus BPMN',
                  bpmn: 'Élément BPMN',
                  raci: 'RACI',
                  actor: 'Rôle',
                  documented: 'Information documentée',
                };
                const params = new URLSearchParams();
                const projectId = result.projectId ?? activeProjectId;
                if (projectId) params.set('projectId', projectId);
                if (result.elementId) params.set('elementId', result.elementId);
                if (result.type === 'documented') params.set('documentedSourceId', result.id);
                if (result.type === 'raci' || result.type === 'actor') params.set('raci', '1');
                const query = params.toString();
                return (
                  <SearchResultItem
                    key={`${result.type}:${result.projectId ?? ''}:${result.resourceId ?? ''}:${result.id}`}
                    badge={{ label: detailByType[result.type], color: '#28569a', background: '#e4efff', border: '#bfd4f7' }}
                    title={result.label}
                    detail={`${detailByType[result.type]} · ${result.excerpt || result.field}`}
                    description={result.description || result.excerpt || undefined}
                    processName={result.processName}
                    similarity={result.matchScore}
                    query={search}
                    onClick={() => {
                      if (!result.resourceId) {
                        if (projectId) navigate(`/projects/${projectId}/viewer`);
                        return;
                      }
                      navigate(query ? `/${result.resourceId}?${query}` : `/${result.resourceId}`);
                    }}
                  />
                );
              })}
              <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography level="body-xs" color="primary" sx={{ cursor: 'pointer', textAlign: 'center' }} onClick={submitSearch}>
                  Voir tous les résultats
                </Typography>
              </Box>
            </Sheet>
          )}
        </Box>

        <Box sx={{ width: '100%', maxWidth: 1040, mx: 'auto' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography level="title-lg" sx={{ fontWeight: 700 }}>
              Dernières pages consultées
            </Typography>
            <Typography level="body-xs" color="neutral">10 dernières pages maximum</Typography>
          </Stack>
          {recentPages.length === 0 ? (
            <Typography level="body-sm" color="neutral">
              Les pages que vous consultez apparaîtront ici automatiquement.
            </Typography>
          ) : (
            <List
              variant="outlined"
              sx={{ borderRadius: 'lg', bgcolor: 'background.surface', '--ListItem-radius': '8px', p: 0.75 }}
            >
              {recentPages.slice(0, 10).map(page => (
                <Box
                  key={page.href}
                  component="li"
                  onClick={() => navigate(page.href)}
                  sx={{ listStyle: 'none', px: 1.5, py: 1.1, borderRadius: 'md', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, '&:hover': { bgcolor: 'background.level1' } }}
                >
                  <Typography level="body-sm" sx={{ fontWeight: 600 }}>{page.label}</Typography>
                  <Typography level="body-xs" color="neutral">
                    {new Date(page.visitedAt).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Stack>
    </WorkspacePageLayout>
  );
};

Component.displayName = 'HomeDashboardContainer';
