import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Input, List, ListItem, Option, Select, Sheet, Stack, Typography } from '@mui/joy';
import { Search } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../../api/resources/resources.queries';
import { contentsQuery, getXmlContentQuery } from '../../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../../Types';
import { ResourceType } from '../../../shared/types/BpmnResource';
import { deriveRaciMatrixFromXml } from '../../../extensions/raci-viewer';

type SearchScope = 'resources' | 'activities' | 'raci';
type SearchResult = {
  key: string;
  title: string;
  detail: string;
  resourceId: string;
  elementId?: string;
};

const destinations = [
  {
    label: 'Référentiel',
    path: '/root',
    matches: (path: string) => path === '/root' || /^\/[0-9a-f-]+(?:\/|$)/i.test(path),
  },
  {
    label: 'Projets',
    path: '/projects',
    matches: (path: string) => path.startsWith('/projects') || path === '/workspace',
  },
  {
    label: 'Administration',
    path: '/organization/overview',
    matches: (path: string) => path.startsWith('/organization'),
  },
];

const matchesTerm = (value: string, term: string) =>
  value.toLocaleLowerCase('fr').includes(term);

export const WorkspaceNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<SearchScope>('resources');
  const [searchOpen, setSearchOpen] = useState(false);
  const [deepResults, setDeepResults] = useState<SearchResult[]>([]);
  const [deepSearchLoading, setDeepSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const resources = useQuery<Resource[]>(resourcesQuery());

  const resourceResults = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term || scope !== 'resources') return [];
    return (resources.data ?? [])
      .filter(resource =>
        (resource.type === ResourceType.Process || resource.type === ResourceType.Folder) &&
        (matchesTerm(resource.name, term) || matchesTerm(resource.description ?? '', term)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .slice(0, 8)
      .map(resource => ({
        key: resource.id,
        title: resource.name,
        detail: `${resource.type === ResourceType.Folder ? 'Dossier' : 'Processus'}${resource.description ? ` · ${resource.description}` : ''}`,
        resourceId: resource.id,
      }));
  }, [resources.data, search, scope]);

  useEffect(() => {
    if (!search.trim() || search.trim().length < 2 || scope === 'resources' || !resources.data) {
      setDeepResults([]);
      setDeepSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setDeepSearchLoading(true);
      const term = search.trim().toLocaleLowerCase('fr');
      const processes = resources.data!.filter(resource => resource.type === ResourceType.Process);
      const found: SearchResult[] = [];

      await Promise.all(processes.map(async process => {
        try {
          const contents: Content[] = await contentsQuery(process.id).queryFn();
          const published = contents
            .filter(content => content.status === ContentStatusEnum.Published)
            .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
          if (!published) return;
          const xml = await getXmlContentQuery(process.id, published.id).queryFn();
          if (!xml || cancelled) return;
          const document = new DOMParser().parseFromString(xml, 'application/xml');
          if (document.getElementsByTagName('parsererror').length) return;

          if (scope === 'activities') {
            const activityTypes = new Set([
              'task', 'userTask', 'serviceTask', 'manualTask', 'scriptTask',
              'businessRuleTask', 'sendTask', 'receiveTask', 'callActivity',
              'subProcess', 'transaction',
            ]);
            Array.from(document.getElementsByTagName('*'))
              .filter(element => activityTypes.has(element.localName))
              .forEach(element => {
                const id = element.getAttribute('id') || '';
                const name = element.getAttribute('name')?.trim() || id;
                if (id && (matchesTerm(name, term) || matchesTerm(id, term))) {
                  found.push({
                    key: `${process.id}:${id}`,
                    title: name,
                    detail: `Activité · ${process.name} · ${id}`,
                    resourceId: process.id,
                    elementId: id,
                  });
                }
              });
          } else {
            const matrix = deriveRaciMatrixFromXml(xml);
            matrix.activities.forEach(activity => {
              activity.cells.forEach(cell => {
                if (cell.codes.length && matchesTerm(cell.role, term)) {
                  found.push({
                    key: `${process.id}:${activity.elementId}:${cell.role}`,
                    title: cell.role,
                    detail: `RACI · ${process.name} · ${activity.activity} (${cell.codes.join('/')})`,
                    resourceId: process.id,
                    elementId: activity.elementId,
                  });
                }
              });
            });
            matrix.roles
              .filter(role => matchesTerm(role, term))
              .forEach(role => {
                const alreadyFound = found.some(result =>
                  result.resourceId === process.id && result.title === role && result.detail.startsWith(`RACI · ${process.name} ·`),
                );
                if (!alreadyFound) {
                  found.push({
                    key: `${process.id}:role:${role}`,
                    title: role,
                    detail: `Rôle RACI · ${process.name}`,
                    resourceId: process.id,
                  });
                }
              });
          }
        } catch {
          // An unavailable process must not prevent searching the other processes.
        }
      }));

      if (!cancelled) {
        const uniqueResults = Array.from(new Map(found.map(result => [result.key, result])).values());
        setDeepResults(uniqueResults.sort((a, b) => a.title.localeCompare(b.title, 'fr')).slice(0, 12));
        setDeepSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, scope, resources.data]);

  const results = scope === 'resources' ? resourceResults : deepResults;

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
    navigate(result.elementId
      ? `/${result.resourceId}?elementId=${encodeURIComponent(result.elementId)}`
      : `/${result.resourceId}`);
  };

  return (
    <Box sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Box component="img" src="/bpmn-tool-logo.svg" alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
          <Box>
            <Typography level="title-lg" sx={{ lineHeight: 1.2 }}>KHI Flows</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Projets, processus et responsabilités, unifiés.
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 560 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Select<SearchScope>
              size="sm"
              value={scope}
              onChange={(_, value) => { if (value) { setScope(value); setSearchOpen(true); } }}
              aria-label="Type de recherche"
              sx={{ minWidth: 138, flexShrink: 0 }}
            >
              <Option value="resources">Référentiel</Option>
              <Option value="activities">Activités</Option>
              <Option value="raci">RACI</Option>
            </Select>
            <Input
              size="sm"
              value={search}
              onChange={event => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              slotProps={{ input: { ref: searchRef, 'aria-label': 'Rechercher dans le référentiel', onKeyDown: event => {
                if (event.key === 'Enter' && results[0]) openResult(results[0]);
              } } }}
              placeholder="Rechercher dans le référentiel…  Ctrl K"
              startDecorator={<Search fontSize="small" />}
              endDecorator={search.trim() ? <Button size="sm" variant="plain" onClick={() => { setSearch(''); setSearchOpen(true); }}>Effacer</Button> : null}
              sx={{ bgcolor: 'background.surface', flex: 1, minWidth: 0 }}
            />
          </Stack>

          {searchOpen && search.trim().length >= 1 && (
            <Sheet
              variant="outlined"
              sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1400, borderRadius: 'md', boxShadow: 'lg', maxHeight: 360, overflowY: 'auto', bgcolor: 'background.surface' }}
            >
              {scope === 'resources' && resources.isLoading && <Typography level="body-sm" sx={{ p: 1.5 }}>Chargement du référentiel…</Typography>}
              {scope !== 'resources' && deepSearchLoading && <Typography level="body-sm" sx={{ p: 1.5 }}>Recherche dans les activités et les données RACI…</Typography>}
              {resources.isError && <Typography level="body-sm" color="danger" sx={{ p: 1.5 }}>Recherche indisponible pour le moment.</Typography>}
              {!resources.isLoading && !deepSearchLoading && results.length === 0 && (
                <Typography level="body-sm" sx={{ p: 1.5 }}>
                  {scope === 'resources' ? 'Aucun processus ou dossier correspondant.' : 'Aucun résultat correspondant.'}
                </Typography>
              )}
              {results.length > 0 && (
                <List size="sm" sx={{ '--ListItem-radius': '6px', p: 0.5 }}>
                  {results.map(result => (
                    <ListItem key={result.key} sx={{ p: 0 }}>
                      <Button variant="plain" color="neutral" onClick={() => openResult(result)}
                        sx={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', whiteSpace: 'normal' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography level="title-sm">{result.title}</Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{result.detail}</Typography>
                        </Box>
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
              {results.length >= 8 && <Typography level="body-xs" sx={{ px: 1.5, pb: 1, color: 'text.tertiary' }}>Affinez la recherche pour réduire les résultats.</Typography>}
            </Sheet>
          )}
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {destinations.map(destination => {
            const active = destination.matches(location.pathname);
            return (
              <Button key={destination.path} size="sm" variant={active ? 'solid' : 'plain'}
                color={active ? 'primary' : 'neutral'} aria-current={active ? 'page' : undefined}
                onClick={() => navigate(destination.path)}>
                {destination.label}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
};
