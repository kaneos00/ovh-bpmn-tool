import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Alert,
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

  const processesQuery = useQuery<Resource[]>(
    resourcesQuery({ type: ResourceType.Process }),
  );

  let selectedTypes: UnifiedSearchType[] | undefined;
  if (roleFilter) {
    selectedTypes = ['raci'];
  } else if (typeFilter) {
    selectedTypes = [typeFilter];
  }

  const searchQuery = useQuery(
    unifiedSearchQuery({
      q: query,
      types: selectedTypes,
      source: sourceFilter || undefined,
      resourceId: processFilter || undefined,
      role: roleFilter || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
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

  const data = searchQuery.data;
  const total = data?.total ?? 0;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const hasPrevious = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <Sheet
      sx={{
        width: '100%',
        maxWidth: 1440,
        boxSizing: 'border-box',
        mx: 'auto',
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
          <Stack direction="row" justifyContent="flex-end">
            <Button size="sm" variant="outlined" color="neutral" onClick={applySearch}>
              Appliquer les filtres
            </Button>
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

            {data.results.map((result) => (
              <Card key={`${result.type}:${result.source}:${result.resourceId}:${result.projectId}:${result.id}`} variant="outlined" sx={{ gap: 0.75 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                    <Chip size="sm" variant="soft">{TYPE_LABELS[result.type]}</Chip>
                    {result.source && (
                      <Chip size="sm" variant="outlined" color="neutral">
                        {SOURCE_LABELS[result.source]}
                      </Chip>
                    )}
                    {result.role && <Chip size="sm" color="success">{result.role}</Chip>}
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
                <Typography level="title-md">{result.label}</Typography>
                <Typography level="body-sm" color="neutral">
                  {FIELD_LABELS[result.field] ?? result.field}: {result.excerpt}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {result.processName && (
                    <Typography level="body-xs" color="neutral">
                      Processus : {result.processName}
                    </Typography>
                  )}
                  {result.elementId && (
                    <Typography level="body-xs" color="neutral">
                      Élément : {result.elementId}
                    </Typography>
                  )}
                  {result.projectId && (
                    <Typography level="body-xs" color="neutral">
                      Projet : {result.projectId}
                    </Typography>
                  )}
                </Stack>
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
