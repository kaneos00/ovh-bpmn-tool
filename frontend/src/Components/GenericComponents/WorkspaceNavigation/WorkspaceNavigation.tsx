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
import { UserAccountMenu } from '../UserAccountMenu/UserAccountMenu';

type SearchScope = 'all' | 'processes' | 'bpmn' | 'roles' | 'raci' | 'iaComm';
type SearchResult = {
  key: string;
  title: string;
  detail: string;
  resourceId: string;
  elementId?: string;
  openRaci?: boolean;
};

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

const destinations = [
  {
    label: 'Référentiel',
    path: '/root',
    matches: (path: string) => path === '/root' || /^\/[0-9a-f-]+(?:\/|$)/i.test(path),
  },
  {
    label: 'Arborescence',
    path: '/reference/tree',
    matches: (path: string) => path === '/reference/tree',
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

const resultKey = (result: SearchResult) => result.key;

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
  if (/IA comm\.|annotation BPMN/i.test(detail)) {
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
  const location = useLocation();
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
  const [deepResults, setDeepResults] = useState<SearchResult[]>([]);
  const [deepSearchLoading, setDeepSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const resources = useQuery<Resource[]>(resourcesQuery());

  const resourceResults = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term || (scope !== 'all' && scope !== 'processes')) return [];
    return (resources.data ?? [])
      .filter(resource =>
        (resource.type === ResourceType.Process || resource.type === ResourceType.Folder) &&
        (matchesTerm(resource.name, term) || matchesTerm(resource.description ?? '', term)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .slice(0, 10)
      .map(resource => ({
        key: resource.id,
        title: resource.name,
        detail: `${resource.type === ResourceType.Folder ? 'Dossier du référentiel' : 'Processus BPMN'}${resource.description ? ` · ${resource.description}` : ''}`,
        resourceId: resource.id,
      }));
  }, [resources.data, search, scope]);

  useEffect(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (term.length < 2 || !resources.data) {
      setDeepResults([]);
      setDeepSearchLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setDeepSearchLoading(true);
      const processes = resources.data!.filter(resource => resource.type === ResourceType.Process);
      const found: SearchResult[] = [];

      await Promise.all(processes.map(async process => {
        try {
          const contents: Content[] = await contentsQuery(process.id).queryFn();
          const published = contents
            .filter(content => content.status === ContentStatusEnum.Published)
            .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
          if (!published || cancelled) return;

          const xml = await getXmlContentQuery(process.id, published.id).queryFn();
          if (!xml || cancelled) return;
          const document = new DOMParser().parseFromString(xml, 'application/xml');
          if (document.getElementsByTagName('parsererror').length) return;

          const bpmnElements = Array.from(document.getElementsByTagName('*'))
            .filter(element => element.namespaceURI === BPMN_MODEL_NS);
          const activityTypes = new Set([
            'task', 'userTask', 'serviceTask', 'manualTask', 'scriptTask',
            'businessRuleTask', 'sendTask', 'receiveTask', 'callActivity',
            'subProcess', 'transaction',
          ]);
          const namedElements = bpmnElements.filter(element => {
            const id = element.getAttribute('id') || '';
            const name = element.getAttribute('name')?.trim() || '';
            return id && (matchesTerm(name, term) || matchesTerm(id, term));
          });

          if (scope === 'all' || scope === 'bpmn') {
            namedElements.forEach(element => {
              const id = element.getAttribute('id') || '';
              const name = element.getAttribute('name')?.trim() || id;
              let kind: string;
            if (element.localName.toLowerCase().includes('subprocess')) {
              kind = 'Sous-processus';
            } else if (element.localName.toLowerCase() === 'lane') {
              kind = 'Lane BPMN';
            } else if (activityTypes.has(element.localName)) {
              kind = 'Activité BPMN';
            } else if (element.localName === 'process') {
              kind = 'Processus BPMN';
            } else {
              kind = `Élément BPMN · ${element.localName}`;
            }
              found.push({
                key: `${process.id}:bpmn:${id}`,
                title: name,
                detail: `${kind} · ${process.name} · ${id}`,
                resourceId: process.id,
                elementId: element.localName === 'process' ? undefined : id,
              });
            });
          }

          if (scope === 'all' || scope === 'processes') {
            namedElements
              .filter(element => element.localName.toLowerCase().includes('subprocess'))
              .forEach(element => {
                const id = element.getAttribute('id') || '';
                const name = element.getAttribute('name')?.trim() || id;
                found.push({
                  key: `${process.id}:subprocess:${id}`,
                  title: name,
                  detail: `Sous-processus · ${process.name} · ${id}`,
                  resourceId: process.id,
                  elementId: id,
                });
              });
          }

          if (scope === 'all' || scope === 'roles' || scope === 'raci') {
            const matrix = deriveRaciMatrixFromXml(xml);
            matrix.roles
                .filter(role => matchesTerm(role, term))
                .forEach(role => {
                  const lane = bpmnElements.find(element =>
                    element.localName === 'lane' &&
                    (element.getAttribute('name') || '').trim() === role,
                  );
                  found.push({
                    key: `${process.id}:role:${role}`,
                    title: role,
                    detail: `Rôle · ${process.name}`,
                    resourceId: process.id,
                    elementId: lane?.getAttribute('id') || undefined,
                    openRaci: true,
                  });
                });

            matrix.activities.forEach(activity => {
              activity.cells.forEach(cell => {
                const roleMatches = matchesTerm(cell.role, term);
                const activityMatches = matchesTerm(activity.activity, term) ||
                  matchesTerm(activity.elementId, term);
                const assignmentMatches = cell.codes.some(code => matchesTerm(code, term));
                if (cell.codes.length && (
                  (scope === 'all' && (roleMatches || activityMatches || assignmentMatches)) ||
                  (scope === 'raci' && (roleMatches || activityMatches || assignmentMatches))
                )) {
                  found.push({
                    key: `${process.id}:raci:${activity.elementId}:${cell.role}`,
                    title: activityMatches ? activity.activity : cell.role,
                    detail: `RACI · ${process.name} · ${activity.activity} — ${cell.role} (${cell.codes.join('/')})`,
                    resourceId: process.id,
                    elementId: activity.elementId,
                    openRaci: true,
                  });
                }
              });
            });
          }

          if (scope === 'all' || scope === 'iaComm') {
            // Search BPMN documentation, text annotations and communication-related labels.
            const textElements = Array.from(document.getElementsByTagName('*')).filter(element => {
              const tag = element.localName.toLocaleLowerCase('fr');
              const text = element.textContent?.trim() || '';
              const name = element.getAttribute('name') || '';
              const isTextContent = /documentation|textannotation|text|message|communication|comment/i.test(tag);
              return isTextContent && text && (matchesTerm(text, term) || matchesTerm(name, term));
            });
            textElements.forEach((element, index) => {
              const text = (element.getAttribute('name') || element.textContent || '').trim().replace(/\s+/g, ' ');
              const title = text.length > 100 ? `${text.slice(0, 97)}…` : text;
              if (!title) return;
              found.push({
                key: `${process.id}:ia-comm:${element.localName}:${index}:${title}`,
                title,
                detail: `IA comm. / annotation BPMN · ${process.name} · ${element.localName}`,
                resourceId: process.id,
              });
            });
          }
        } catch {
          // An unavailable process must not prevent searching the other processes.
        }
      }));

      if (!cancelled) {
        const uniqueResults = Array.from(new Map(found.map(result => [resultKey(result), result])).values());
        setDeepResults(uniqueResults.sort((a, b) => a.title.localeCompare(b.title, 'fr')).slice(0, 20));
        setDeepSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, scope, resources.data]);

  const results = useMemo(() => {
    const combined = scope === 'all' || scope === 'processes' ? [...resourceResults, ...deepResults] : deepResults;
    return Array.from(new Map(combined.map(result => [result.key, result])).values()).slice(0, 20);
  }, [scope, resourceResults, deepResults]);

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
    const params = new URLSearchParams();
    if (result.elementId) params.set('elementId', result.elementId);
    if (result.openRaci) params.set('raci', '1');
    const query = params.toString();
    navigate(query ? `/${result.resourceId}?${query}` : `/${result.resourceId}`);
  };

  const isLoading = resources.isLoading || deepSearchLoading;

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
            <Typography level="title-lg" sx={{ lineHeight: 1.2, color: '#fff', fontWeight: 800 }}>KHI Flows</Typography>
            <Typography level="body-xs" sx={{ color: '#b4c3d5' }}>
              Projets, processus et responsabilités, unifiés.
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 620 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Select<SearchScope>
              size="sm"
              value={scope}
              onChange={(_, value) => { if (value) { setScope(value); setSearchOpen(true); } }}
              aria-label="Type de recherche"
              sx={{ minWidth: 170, flexShrink: 0, bgcolor: '#263e59', color: '#fff', borderColor: '#40556d', '--Select-focusedHighlight': '#91b7ff', '&:hover': { bgcolor: '#2b4664' } }}
            >
              <Option value="all">Tout rechercher</Option>
              <Option value="processes">Processus / sous-processus</Option>
              <Option value="bpmn">Éléments BPMN</Option>
              <Option value="roles">Rôles</Option>
              <Option value="raci">RACI</Option>
              <Option value="iaComm">IA comm. / annotations</Option>
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
              sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1400, width: '100%', borderRadius: 'md', maxHeight: 280, overflowY: 'auto', bgcolor: 'background.surface', boxShadow: 'lg' }}
            >
              {isLoading && <Typography level="body-sm" sx={{ p: 1.5 }}>Recherche dans les contenus…</Typography>}
              {resources.isError && <Typography level="body-sm" color="danger" sx={{ p: 1.5 }}>Recherche indisponible pour le moment.</Typography>}
              {!isLoading && results.length === 0 && (
                <Typography level="body-sm" sx={{ p: 1.5 }}>
                  Aucun résultat correspondant dans ce type de contenu.
                </Typography>
              )}
              {results.length > 0 && (
                <List size="sm" sx={{ '--ListItem-radius': '6px', p: 0.5 }}>
                  {results.map(result => (
                    <ListItem key={result.key} sx={{ p: 0 }}>
                      <Button variant="plain" color="neutral" onClick={() => openResult(result)}
                        sx={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', whiteSpace: 'normal' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                          <Box
                            component="span"
                            aria-label={resultBadge(result.detail).label}
                            sx={{
                              flex: '0 0 auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mt: '1px',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: '5px',
                              border: '1px solid',
                              borderColor: resultBadge(result.detail).border,
                              color: resultBadge(result.detail).color,
                              bgcolor: resultBadge(result.detail).background,
                              fontSize: 10,
                              fontWeight: 800,
                              lineHeight: 1.4,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {resultBadge(result.detail).label}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography level="title-sm">{result.title}</Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{result.detail}</Typography>
                          </Box>
                        </Box>
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
              {results.length >= 10 && <Typography level="body-xs" sx={{ px: 1.5, pb: 1, color: 'text.tertiary' }}>Affinez la recherche pour réduire les résultats.</Typography>}
            </Sheet>
          )}
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {destinations
            .filter(destination => {
              if (destination.label === 'Administration') return globalRole === 'admin';
              if (destination.label === 'Projets') return globalRole === 'admin' || globalRole === 'modeler';
              return true;
            })
            .map(destination => {
            const active = destination.matches(location.pathname);
            return (
              <Button key={destination.path} size="sm" variant={active ? 'solid' : 'plain'}
                color={active ? 'primary' : 'neutral'} aria-current={active ? 'page' : undefined}
                onClick={() => navigate(destination.path)}
                sx={active ? { bgcolor: '#2864d7', color: '#fff', fontWeight: 700 } : { color: '#e6edf7', '&:hover': { bgcolor: '#263e59', color: '#fff' } }}>
                {destination.label}
              </Button>
            );
          })}
          <UserAccountMenu />
        </Stack>
      </Stack>
    </Box>
  );
};
