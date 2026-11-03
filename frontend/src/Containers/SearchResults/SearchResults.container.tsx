import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';
import {
  ChevronLeft,
  ChevronRight,
  OpenInNew,
  Search,
} from '@mui/icons-material';

import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { resourcesQuery } from '../../api/resources/resources.queries';
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';
import {
  unifiedSearchQuery,
  type UnifiedSearchRole,
  type UnifiedSearchSource,
  type UnifiedSearchType,
} from '../../api/search/search.queries';

const PAGE_SIZE = 30;

const TYPE_LABELS: Record<UnifiedSearchType, string> = {
  process: 'Processus',
  bpmn: 'Élément BPMN',
  raci: 'Responsabilité RACI',
  actor: 'Acteur / rôle',
};

const SOURCE_LABELS: Record<UnifiedSearchSource, string> = {
  resource: 'Référentiel',
  bpmn: 'Contenu BPMN',
  'project-raci': 'RACI du projet',
  'project-actor': 'Acteurs du projet',
};

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nom',
  descrizione: 'Description',
  identificativo: 'Identifiant',
  'testo annotazione': 'Texte de l’annotation',
  attività: 'Activité',
  attore: 'Acteur',
  responsabilità: 'Responsabilité',
  'identificativo attività': 'Identifiant de l’activité',
};

const isSearchType = (value: string): value is UnifiedSearchType =>
  ['process', 'bpmn', 'raci', 'actor'].includes(value);

const isSearchSource = (value: string): value is UnifiedSearchSource =>
  ['resource', 'bpmn', 'project-raci', 'project-actor'].includes(value);

const isSearchRole = (value: string): value is UnifiedSearchRole =>
  ['R', 'A', 'C', 'I'].includes(value);

export const Component = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [draftQuery, setDraftQuery] = useState(query);
  const [typeFilter, setTypeFilter] = useState<UnifiedSearchType | ''>(() => {
    const value = searchParams.get('types') ?? '';
    return isSearchType(value) ? value : '';
  });
  const [sourceFilter, setSourceFilter] = useState<UnifiedSearchSource | ''>(() => {
    const value = searchParams.get('source') ?? '';
    return isSearchSource(value) ? value : '';
  });
  const [processFilter, setProcessFilter] = useState(searchParams.get('resourceId') ?? '');
  const [roleFilter, setRoleFilter] = useState<UnifiedSearchRole | ''>(() => {
    const value = searchParams.get('role') ?? '';
    return isSearchRole(value) ? value : '';
  });
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    const value = searchParams.get('types') ?? '';
    setTypeFilter(isSearchType(value) ? value : '');
    const source = searchParams.get('source') ?? '';
    setSourceFilter(isSearchSource(source) ? source : '');
    setProcessFilter(searchParams.get('resourceId') ?? '');
    const role = searchParams.get('role') ?? '';
    setRoleFilter(isSearchRole(role) ? role : '');
  }, [searchParams]);

  const [sortBy, setSortBy] = useState('relevance');
  const [sortDirection, setSortDirection] = useState('asc');
  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    let active = true;
    fetch(`${base}/auth/preferences/search-sort`, { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (active && value) { if (['relevance','type','label','source','process'].includes(value.sortBy)) setSortBy(value.sortBy); if (value.sortDirection === 'asc' || value.sortDirection === 'desc') setSortDirection(value.sortDirection); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const saveSort = (field: string, direction: string) => {
    setSortBy(field); setSortDirection(direction);
    const base = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    fetch(`${base}/auth/preferences/search-sort`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortBy: field, sortDirection: direction }) }).catch(() => undefined);
  };
  const processesQuery = useQuery<Resource[]>(
    resourcesQuery({ type: ResourceType.Process }),
  );

  let selectedTypes: UnifiedSearchType[] | undefined;
  if (roleFilter) {
    selectedTypes = ['raci'];
  } else if (typeFilter) {
    selectedTypes = [typeFilter];
  }

  const searchOptions = unifiedSearchQuery({
    q: query,
    types: selectedTypes,
    source: sourceFilter || undefined,
    resourceId: processFilter || undefined,
    role: roleFilter || undefined,
    limit: PAGE_SIZE,
    offset,
  });
  const searchQuery = useQuery(
    searchOptions.queryKey,
    searchOptions.queryFn,
    {
      enabled: query.trim().length >= 2,
      keepPreviousData: true,
    },
  );

  const processes = useMemo(
    () => [...(processesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [processesQuery.data],
  );

  const applySearch = () => {
    const next = new URLSearchParams();
    if (draftQuery.trim()) next.set('q', draftQuery.trim());
    if (typeFilter) next.set('types', typeFilter);
    if (sourceFilter) next.set('source', sourceFilter);
    if (processFilter) next.set('resourceId', processFilter);
    if (roleFilter) {
      next.set('role', roleFilter);
      next.set('types', 'raci');
    }
    next.set('offset', '0');
    setSearchParams(next);
  };

  const updateOffset = (nextOffset: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('offset', String(nextOffset));
    setSearchParams(next);
  };

  const openResult = (result: {
    resourceId?: string;
    projectId?: string;
    elementId?: string;
    type: UnifiedSearchType;
  }) => {
    if (!result.resourceId && result.projectId) {
      navigate(`/projects/${result.projectId}/viewer`);
      return;
    }
    if (!result.resourceId) return;

    const params = new URLSearchParams();
    if (result.elementId) params.set('elementId', result.elementId);
    if (result.type === 'raci') params.set('raci', '1');
    const queryString = params.toString();
    navigate(queryString ? `/${result.resourceId}?${queryString}` : `/${result.resourceId}`);
  };

  const highlight = (value: string) => {
    const term = query.trim();
    if (!term) return value;
    const index = value.toLocaleLowerCase('fr').indexOf(term.toLocaleLowerCase('fr'));
    if (index < 0) return value;
    return <>{value.slice(0, index)}<Box component="mark" sx={{ bgcolor: '#fff1a8', color: 'inherit', px: 0.15, borderRadius: '2px' }}>{value.slice(index, index + term.length)}</Box>{value.slice(index + term.length)}</>;
  };

  const getTypeColor = (type: UnifiedSearchType) => {
    switch (type) {
      case 'process':
        return 'warning';
      case 'bpmn':
        return 'primary';
      case 'raci':
        return 'success';
      case 'actor':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const data = searchQuery.data;
  const total = data?.total ?? 0;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const hasPrevious = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <Sheet
      sx={{
        width: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box',
        mx: 0,
        p: { xs: 1, md: 2 },
        bgcolor: 'transparent',
      }}
    >
      <Stack spacing={2}>
        <WorkspaceNavigation />

        <Stack spacing={0.5}>
          <Typography level="h2">Résultats de recherche</Typography>
          <Typography level="body-sm" color="neutral">
            Recherche approfondie dans les processus, les éléments BPMN, les rôles et les responsabilités.
          </Typography>
        </Stack>

        <Card variant="outlined" sx={{ gap: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
            <Input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
              placeholder="Saisir un nom, une description, une activité, un rôle…"
              startDecorator={<Search fontSize="small" />}
              sx={{ flex: 1, minWidth: 220 }}
              aria-label="Texte à rechercher"
            />
            <Button onClick={applySearch} disabled={draftQuery.trim().length < 2}>
              Rechercher
            </Button>
          </Stack>

          <Divider />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            useFlexGap
            flexWrap="wrap"
          >
            <Select<UnifiedSearchType | ''>
              value={typeFilter}
              onChange={(_, value) => {
                setTypeFilter(value ?? '');
                if (value !== 'raci') setRoleFilter('');
              }}
              placeholder="Tous les types"
              aria-label="Filtrer par type"
              sx={{ minWidth: 170, flex: 1 }}
            >
              <Option value="">Tous les types</Option>
              <Option value="process">Processus</Option>
              <Option value="bpmn">Éléments BPMN</Option>
              <Option value="raci">Responsabilités RACI</Option>
              <Option value="actor">Acteurs / rôles</Option>
            </Select>

            <Select<UnifiedSearchSource | ''>
              value={sourceFilter}
              onChange={(_, value) => setSourceFilter(value ?? '')}
              placeholder="Toutes les sources"
              aria-label="Filtrer par source"
              sx={{ minWidth: 170, flex: 1 }}
            >
              <Option value="">Toutes les sources</Option>
              <Option value="resource">Référentiel</Option>
              <Option value="bpmn">Contenu BPMN</Option>
              <Option value="project-raci">RACI du projet</Option>
              <Option value="project-actor">Acteurs du projet</Option>
            </Select>

            <Select<string>
              value={processFilter}
              onChange={(_, value) => setProcessFilter(value ?? '')}
              placeholder="Tous les processus"
              aria-label="Filtrer par processus"
              sx={{ minWidth: 220, flex: 1 }}
              disabled={processesQuery.isLoading}
            >
              <Option value="">Tous les processus</Option>
              {processes.map((process) => (
                <Option key={process.id} value={process.id}>
                  {process.name}
                </Option>
              ))}
            </Select>

            <Select<UnifiedSearchRole | ''>
              value={roleFilter}
              onChange={(_, value) => {
                setRoleFilter(value ?? '');
                if (value) setTypeFilter('raci');
              }}
              placeholder="Tous les rôles RACI"
              aria-label="Filtrer par responsabilité RACI"
              sx={{ minWidth: 170, flex: 1 }}
              disabled={typeFilter !== 'raci'}
            >
              <Option value="">Tous les rôles RACI</Option>
              <Option value="R">R — Responsable</Option>
              <Option value="A">A — Approbateur / redevable</Option>
              <Option value="C">C — Consulté</Option>
              <Option value="I">I — Informé</Option>
            </Select>
          </Stack>
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button size="sm" variant="plain" color="neutral" onClick={() => { setDraftQuery(''); setTypeFilter(''); setSourceFilter(''); setProcessFilter(''); setRoleFilter(''); const next = new URLSearchParams(); next.set('offset', '0'); setSearchParams(next); }}>Réinitialiser les filtres</Button>
            <Button size="sm" variant="outlined" color="neutral" onClick={applySearch}>Appliquer les filtres</Button>
          </Stack>
        </Card>

        {query.trim().length < 2 && (
          <Alert color="neutral">
            Saisissez au moins deux caractères pour lancer une recherche approfondie.
          </Alert>
        )}

        {searchQuery.isLoading && query.trim().length >= 2 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size="sm" />
            <Typography level="body-sm">Recherche dans les contenus accessibles…</Typography>
          </Stack>
        )}

        {searchQuery.isError && (
          <Alert color="danger">
            Impossible d’effectuer la recherche. Vérifiez votre session et réessayez.
          </Alert>
        )}

        {data?.coverage.partial && (
          <Alert color="warning">
            Résultats partiels : {data.coverage.bpmnDocumentsScanned} documents sur {data.coverage.bpmnDocumentsAvailable} ont été analysés. Certains contenus ont été ignorés en raison des limites de sécurité ou de couverture.
          </Alert>
        )}

        {data && !searchQuery.isLoading && (
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              <Typography level="title-md">
                {total} résultat{total > 1 ? 's' : ''} pour « {data.query} »
              </Typography>
              <Typography level="body-xs" color="neutral">
                {data.coverage.readableProcesses} processus accessibles · {data.coverage.bpmnDocumentsScanned}/{data.coverage.bpmnDocumentsAvailable} contenus BPMN analysés
              </Typography>
            </Stack>

            {data.results.length === 0 && (
              <Card variant="outlined">
                <Typography level="title-sm">Aucun résultat</Typography>
                <Typography level="body-sm" color="neutral">
                  Essayez un autre terme ou élargissez les filtres.
                </Typography>
              </Card>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Typography level="body-sm" color="neutral">Trier par</Typography>
              <Select size="sm" value={sortBy} onChange={(_, value) => value && saveSort(value, sortDirection)} sx={{ minWidth: 170 }}><Option value="relevance">Pertinence</Option><Option value="type">Type</Option><Option value="label">Nom</Option><Option value="source">Source</Option><Option value="process">Processus</Option></Select>
              <Select size="sm" value={sortDirection} onChange={(_, value) => value && saveSort(sortBy, value)} sx={{ minWidth: 130 }}><Option value="asc">Croissant</Option><Option value="desc">Décroissant</Option></Select>
            </Stack>
            {([...data.results].sort((a, b) => {
              const get = (item: typeof data.results[number]) => {
                if (sortBy === 'type') return TYPE_LABELS[item.type];
                if (sortBy === 'source') return item.source ? SOURCE_LABELS[item.source] : '';
                if (sortBy === 'process') return item.processName || '';
                return item.label;
              };
              if (sortBy === 'relevance') return 0;
              return get(a).localeCompare(get(b), 'fr') * (sortDirection === 'asc' ? 1 : -1);
            })).map((result) => (
              <Card key={`${result.type}:${result.source}:${result.resourceId}:${result.projectId}:${result.id}`} variant="outlined" sx={{ gap: 0.75 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                    <Chip size="sm" variant="soft" color={getTypeColor(result.type)}>{TYPE_LABELS[result.type]}</Chip>
                    {result.source && (
                      <Chip size="sm" variant="outlined" color="neutral">
                        {SOURCE_LABELS[result.source]}
                      </Chip>
                    )}
                    {result.role && <Chip size="sm" color="success">{result.role}</Chip>}
                    <Typography level="title-md" sx={{ minWidth: 0 }}>{highlight(result.label)}</Typography>
                  </Stack>
                  <Button
                    size="sm"
                    variant="plain"
                    endDecorator={<OpenInNew fontSize="small" />}
                    disabled={!result.resourceId && !result.projectId}
                    onClick={() => openResult(result)}
                  >
                    Ouvrir
                  </Button>
                </Stack>
                <Typography level="body-sm" color="neutral" sx={{ fontSize: '0.82rem', color: 'text.tertiary' }}>
                  {FIELD_LABELS[result.field] ?? result.field}: {highlight(result.excerpt)}
                </Typography>
                <Typography level="body-xs" color="neutral" sx={{ color: 'text.tertiary' }}>
                  {[result.processName && `Processus : ${result.processName}`, result.elementId && `Élément : ${result.elementId}`, result.projectId && `Projet : ${result.projectId}`].filter(Boolean).join(' · ')}
                </Typography>
              </Card>
            ))}

            {total > PAGE_SIZE && (
              <>
                <Divider />
                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                  <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    startDecorator={<ChevronLeft />}
                    disabled={!hasPrevious}
                    onClick={() => updateOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Précédent
                  </Button>
                  <Typography level="body-sm" color="neutral">
                    Page {pageNumber} · {total} résultats
                  </Typography>
                  <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    endDecorator={<ChevronRight />}
                    disabled={!hasNext}
                    onClick={() => updateOffset(offset + PAGE_SIZE)}
                  >
                    Suivant
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'SearchResultsContainer';
