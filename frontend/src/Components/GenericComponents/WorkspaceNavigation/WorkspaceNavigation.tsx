import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, List, Option, Select, Sheet, Stack, Typography } from '@mui/joy';
import { Search } from '@mui/icons-material';
import { useActiveProject } from '../../../shared/hooks/useActiveProject';
import { useQuery } from 'react-query';

import { unifiedSearchQuery, type UnifiedSearchType } from '../../../api/search/search.queries';
import { UserAccountMenu } from '../UserAccountMenu/UserAccountMenu';
import { SearchResultItem } from '../SearchResultItem/SearchResultItem';
import { getProjectTrigram } from '../../../shared/helpers/projectTrigram';

type SearchScope = 'all' | 'processes' | 'bpmn' | 'roles' | 'raci';
type SearchResult = {
  key: string;
  title: string;
  detail: string;
  resourceId?: string;
  projectId?: string;
  elementId?: string;
  openRaci?: boolean;
  processName?: string;
  description?: string;
  similarity?: number;
};

const resultBadge = (detail: string) => {
  if (/\bRACI\b/i.test(detail)) {
    return {
      label: 'RACI',
      color: '#654c98',
      background: '#eee8fb',
      border: '#d5c8f0',
    };
  }
  if (/\bLane\b/i.test(detail)) {
    return {
      label: 'Lane',
      color: '#276b63',
      background: '#e0f3ef',
      border: '#b9e3da',
    };
  }
  if (/Sous-processus/i.test(detail)) {
    return {
      label: 'Sous-processus',
      color: '#28569a',
      background: '#e4efff',
      border: '#bfd4f7',
    };
  }
  if (/Activité BPMN/i.test(detail)) {
    return {
      label: 'Activité',
      color: '#28569a',
      background: '#e4efff',
      border: '#bfd4f7',
    };
  }
  if (/Processus BPMN/i.test(detail)) {
    return {
      label: 'Processus',
      color: '#895d1e',
      background: '#fff0d9',
      border: '#f0d5a6',
    };
  }
  if (/Dossier du référentiel/i.test(detail)) {
    return {
      label: 'Dossier',
      color: '#276b43',
      background: '#e2f4e8',
      border: '#bde2c8',
    };
  }
  if (/Rôle/i.test(detail)) {
    return {
      label: 'Rôle',
      color: '#654c98',
      background: '#eee8fb',
      border: '#d5c8f0',
    };
  }
  if (/annotation BPMN|Description/i.test(detail)) {
    return {
      label: 'Description',
      color: '#4b5563',
      background: '#f1f5f9',
      border: '#d8e0e8',
    };
  }
  if (/IA comm\./i.test(detail)) {
    return {
      label: 'Annotation',
      color: '#4b5563',
      background: '#f1f5f9',
      border: '#d8e0e8',
    };
  }
  return {
    label: 'BPMN',
    color: '#4b5563',
    background: '#f1f5f9',
    border: '#d8e0e8',
  };
};

export const WorkspaceNavigation = () => {
  const [globalRole, setGlobalRole] = useState<'admin' | 'modeler' | 'viewer' | null>(null);

  useEffect(() => {
    let mounted = true;
    const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    fetch(`${apiBase}/auth/session`, { credentials: 'same-origin' })
      .then(async response => (response.ok ? response.json() : null))
      .then(session => {
        if (mounted) setGlobalRole(session?.role ?? null);
      })
      .catch(() => {
        if (mounted) setGlobalRole(null);
      });
    return () => { mounted = false; };
  }, []);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const { projects, activeProject, activeProjectId, setActiveProject, isLoading: projectsLoading } = useActiveProject();

  const typeByScope: Partial<Record<SearchScope, UnifiedSearchType>> = {
    processes: 'process',
    bpmn: 'bpmn',
    roles: 'actor',
    raci: 'raci',
  };
  const searchOptions = unifiedSearchQuery({
    q: search.trim(),
    types: typeByScope[scope] ? [typeByScope[scope]!] : undefined,
    projectId: activeProjectId ?? undefined,
    limit: 20,
    offset: 0,
  });
  const {
    data: searchData,
    isLoading: deepSearchLoading,
    isError: searchError,
  } = useQuery(
    searchOptions.queryKey,
    searchOptions.queryFn,
    { enabled: search.trim().length >= 2 && !projectsLoading },
  );

  const results: SearchResult[] = (searchData?.results ?? []).map(result => {
    const detailByType: Record<UnifiedSearchType, string> = {
      process: 'Processus BPMN',
      bpmn: 'Élément BPMN',
      raci: 'RACI',
      actor: 'Rôle',
    };
    const detailLabel = result.field === 'testo annotazione' || result.field === 'descrizione'
      ? 'Description'
      : detailByType[result.type];
    return {
      key: result.id,
      title: result.label,
      detail: `${detailLabel} · ${result.excerpt || result.field}`,
      resourceId: result.resourceId,
      projectId: result.projectId,
      elementId: result.elementId,
      processName: result.processName,
      description: result.description || result.excerpt || undefined,
      similarity: result.matchScore,
      openRaci: result.type === 'raci' || result.type === 'actor',
    };
  });

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  const openResult = (result: SearchResult) => {
    setSearchOpen(false);
    setSearch('');
    if (!result.resourceId) {
      if (result.projectId) navigate(`/projects/${result.projectId}/viewer`);
      return;
    }
    const params = new URLSearchParams();
    const projectId = result.projectId ?? activeProjectId;
    if (projectId) params.set('projectId', projectId);
    if (result.elementId) params.set('elementId', result.elementId);
    if (result.openRaci) params.set('raci', '1');
    const query = params.toString();
    navigate(query ? `/${result.resourceId}?${query}` : `/${result.resourceId}`);
  };

  const openAllResults = () => {
    const term = search.trim();
    if (term.length < 2) return;
    const params = new URLSearchParams({ q: term });
    const type = typeByScope[scope];
    if (type) params.set('types', type);
    setSearchOpen(false);
    if (activeProjectId) params.set('projectId', activeProjectId);
    navigate(`/search?${params.toString()}`);
  };

  const isLoading = projectsLoading || deepSearchLoading;

  return (
    <Box className="workspace-navigation" sx={{ mb: 1.5, p: { xs: 1.25, md: 1.75 }, borderRadius: '10px', bgcolor: '#152b45', color: '#fff', border: '1px solid #152b45', boxShadow: '0 2px 8px rgba(21,43,69,.08)' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Box component="img" src="/bpmn-tool-logo.svg" alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
          <Box>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography level="title-lg" sx={{ lineHeight: 1.2, color: '#fff', fontWeight: 800 }}>KHI Flows</Typography>
              <Box
                component="span"
                title={`Version de build : ${import.meta.env.VITE_BUILD_ID || import.meta.env.VITE_BUILD_COMMIT || 'local'} · Commit : ${import.meta.env.VITE_BUILD_COMMIT || 'non injecté par Coolify'} · Branche : ${import.meta.env.VITE_BUILD_BRANCH || 'non injectée par Coolify'} · CI : ${import.meta.env.VITE_BUILD_RUN_NUMBER || 'non injecté par Coolify'}`}
                aria-label={`Version de build ${(import.meta.env.VITE_BUILD_ID || import.meta.env.VITE_BUILD_COMMIT || 'local').slice(0, 12)}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.9,
                  py: 0.25,
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: import.meta.env.VITE_BUILD_COMMIT && import.meta.env.VITE_BUILD_COMMIT !== 'unknown' ? '#5f8ee8' : '#d99a42',
                  bgcolor: import.meta.env.VITE_BUILD_COMMIT && import.meta.env.VITE_BUILD_COMMIT !== 'unknown' ? '#203f72' : '#60451e',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {import.meta.env.VITE_BUILD_RUN_NUMBER && import.meta.env.VITE_BUILD_RUN_NUMBER !== 'unknown'
                  ? `CI #${import.meta.env.VITE_BUILD_RUN_NUMBER}`
                  : 'BUILD'}
                {' · '}
                {(
                  import.meta.env.VITE_BUILD_COMMIT && import.meta.env.VITE_BUILD_COMMIT !== 'unknown'
                    ? import.meta.env.VITE_BUILD_COMMIT
                    : import.meta.env.VITE_BUILD_ID || 'local'
                ).slice(0, 12)}
              </Box>
            </Stack>
            <Typography level="body-xs" sx={{ color: '#b4c3d5' }}>
              Projets, processus et responsabilités, unifiés.
            </Typography>
          </Box>
        </Stack>

        <Select<string>
          size="sm"
          value={activeProjectId ?? undefined}
          placeholder="Choisir un projet…"
          onChange={(_, value) => {
            if (!value) return;
            setActiveProject(value);
            setSearch('');
            setSearchOpen(false);
            navigate('/root');
          }}
          disabled={projectsLoading || projects.length === 0}
          aria-label="Projet actif"
          renderValue={() => activeProject ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, px: 0.5, borderRadius: '6px', bgcolor: activeProject.color || '#2864d7', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
                {getProjectTrigram(activeProject.name, activeProject.trigram)}
              </Box>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeProject.name}
              </Box>
            </Stack>
          ) : null}
          sx={{ minWidth: 180, maxWidth: 280, bgcolor: 'background.surface', color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'background.level1' }, '& .MuiSelect-indicator': { color: 'text.secondary' } }}
        >
          {projects.map(project => <Option key={project.id} value={project.id}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, px: 0.5, borderRadius: '6px', bgcolor: project.color || '#2864d7', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
                {getProjectTrigram(project.name, project.trigram)}
              </Box>
              <Box component="span">{project.name}</Box>
            </Stack>
          </Option>)}
        </Select>

        <Box sx={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 620 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Select<SearchScope>
              size="sm"
              value={scope}
              onChange={(_, value) => { if (value) { setScope(value); setSearchOpen(true); } }}
              aria-label="Type de recherche"
              sx={{ width: 210, minWidth: 210, flex: '0 0 210px', bgcolor: '#263e59', color: '#fff', borderColor: '#40556d', '--Select-focusedHighlight': '#91b7ff', '&:hover': { bgcolor: '#2b4664' } }}
            >
              <Option value="all">Tout rechercher</Option>
              <Option value="processes">Processus / sous-processus</Option>
              <Option value="bpmn">Éléments BPMN</Option>
              <Option value="roles">Rôles</Option>
              <Option value="raci">RACI</Option>
            </Select>
            <Input
              size="sm"
              value={search}
              onChange={event => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              slotProps={{ input: { ref: searchRef, 'aria-label': 'Rechercher dans tous les contenus', onKeyDown: event => {
                if (event.key === 'Enter' && results[0]) openResult(results[0]);
              } } }}
              placeholder="Rechercher processus, BPMN, rôles, RACI…  Ctrl K"
              startDecorator={<Search fontSize="small" />}
              endDecorator={search.trim() ? <Button size="sm" variant="plain" onClick={() => { setSearch(''); setSearchOpen(true); }}>Effacer</Button> : null}
              sx={{ bgcolor: '#263e59', color: '#fff', borderColor: '#40556d', flex: 1, minWidth: 0, '--Input-placeholderColor': '#b4c3d5', '& input': { color: '#fff' }, '&:hover': { bgcolor: '#2b4664' } }}
            />
          </Stack>

          {searchOpen && search.trim().length >= 1 && (
            <Sheet
              variant="outlined"
              sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 'calc(210px + 6px)', right: 0, zIndex: 1600, width: 'auto', minWidth: 0, borderRadius: 'md', maxHeight: 'min(70vh, 620px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.surface', boxShadow: 'lg' }}
            >
              {search.trim().length >= 2 && (
                <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.surface', position: 'sticky', top: 0, zIndex: 1 }}>
                  <Button size="sm" variant="soft" color="primary" fullWidth onClick={openAllResults}>
                    Voir tous les résultats
                  </Button>
                </Box>
              )}
              <Box sx={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
              {isLoading && <Typography level="body-sm" sx={{ p: 1.5 }}>Recherche dans les contenus…</Typography>}
              {searchError && <Typography level="body-sm" color="danger" sx={{ p: 1.5 }}>Recherche indisponible pour le moment. Réessayez ou ouvrez la page de résultats.</Typography>}
              {!isLoading && results.length === 0 && (
                <Typography level="body-sm" sx={{ p: 1.5 }}>
                  Aucun résultat correspondant dans ce type de contenu.
                </Typography>
              )}
              {results.length > 0 && (
                <List size="sm" sx={{ '--ListItem-radius': '6px', p: 0.5 }}>
                  {results.map(result => (
                    <SearchResultItem
                      key={result.key}
                      badge={resultBadge(result.detail)}
                      title={result.title}
                      processName={result.processName}
                      description={result.description}
                      similarity={result.similarity}
                      detail={result.detail}
                      query={search}
                      onClick={() => openResult(result)}
                    />
                  ))}
                </List>
              )}
              {results.length >= 10 && <Typography level="body-xs" sx={{ px: 1.5, pb: 1, color: 'text.tertiary' }}>Affinez la recherche pour réduire les résultats.</Typography>}
              </Box>
            </Sheet>
          )}
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {globalRole === 'admin' && (
            <Button
              size="sm"
              variant="plain"
              color="neutral"
              onClick={() => navigate('/organization/overview')}
              sx={{ color: '#e6edf7', '&:hover': { bgcolor: '#263e59', color: '#fff' } }}
            >
              Administration
            </Button>
          )}
          <UserAccountMenu />
        </Stack>
      </Stack>
    </Box>
  );
};

export const WorkspacePageHeader = WorkspaceNavigation;
