import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, List, Option, Select, Sheet, Stack, Typography } from '@mui/joy';
import { Search } from '@mui/icons-material';
import { useActiveProject } from '../../../shared/hooks/useActiveProject';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../../api/resources/resources.queries';
import { contentsQuery, getXmlContentQuery } from '../../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../../Types';
import { ResourceType } from '../../../shared/types/BpmnResource';
import { deriveRaciMatrixFromXml } from '../../../extensions/raci-viewer';
import { UserAccountMenu } from '../UserAccountMenu/UserAccountMenu';
import { SearchResultItem } from '../SearchResultItem/SearchResultItem';
import { getProjectTrigram } from '../../../shared/helpers/projectTrigram';

type SearchScope = 'all' | 'processes' | 'bpmn' | 'roles' | 'raci';
type SearchResult = {
  key: string;
  title: string;
  detail: string;
  resourceId: string;
  elementId?: string;
  openRaci?: boolean;
  processName?: string;
  description?: string;
  similarity?: number;
};

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMN_CONNECTION_TYPES = new Set([
  'sequenceflow', 'messageflow', 'association', 'datainputassociation',
  'dataoutputassociation', 'conversationlink',
]);

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();

const editDistance = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  let previous = row;
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[right.length];
};

const similarityFor = (value: string, query: string) => {
  const normalizedValue = normalizeSearch(value);
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 0;
  const queryWords = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);
  const valueWords = normalizedValue.split(/[^a-z0-9]+/).filter(Boolean);
  if (normalizedValue === normalizedQuery || (queryWords.length > 0 && queryWords.every(word => valueWords.includes(word)))) return 100;
  if (!queryWords.length || !valueWords.length) return 0;
  const scores = queryWords.map(word => {
    let best = 0;
    valueWords.forEach(candidate => {
      if (candidate === word) best = 100;
      else if (candidate.includes(word)) best = Math.max(best, word.length / candidate.length * 100);
      else {
        const maxDistance = word.length >= 8 ? 2 : 1;
        if (word.length >= 5 && Math.abs(candidate.length - word.length) <= maxDistance) {
          const distance = editDistance(candidate, word);
          if (distance <= maxDistance) best = Math.max(best, (1 - distance / Math.max(candidate.length, word.length)) * 100);
        }
      }
    });
    return best;
  });
  return scores.some(score => score === 0)
    ? 0
    : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

const matchesTerm = (value: string, term: string) =>
  normalizeSearch(value).includes(normalizeSearch(term));

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
  const [deepResults, setDeepResults] = useState<SearchResult[]>([]);
  const [deepSearchLoading, setDeepSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const resources = useQuery<Resource[]>(resourcesQuery());
  const { projects, activeProject, activeProjectId, setActiveProject, projectProcessIds, isLoading: projectsLoading } = useActiveProject();

  const resourceResults = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term || (scope !== 'all' && scope !== 'processes')) return [];
    const allResources = resources.data ?? [];
    const allowedIds = new Set(projectProcessIds);
    const byId = new Map(allResources.map(resource => [resource.id, resource]));
    projectProcessIds.forEach(id => {
      let current = byId.get(id);
      while (current?.parentId) {
        allowedIds.add(current.parentId);
        current = byId.get(current.parentId);
      }
    });
    return allResources
      .filter(resource => allowedIds.has(resource.id) &&
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
        processName: resource.type === ResourceType.Process ? undefined : resource.name,
        description: resource.description || undefined,
        similarity: similarityFor(`${resource.name} ${resource.description ?? ''}`, search),
      }));
  }, [resources.data, search, scope, projectProcessIds]);

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
      const processes = resources.data!.filter(resource => resource.type === ResourceType.Process && projectProcessIds.has(resource.id));
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
            if (BPMN_CONNECTION_TYPES.has(element.localName.toLocaleLowerCase('fr'))) return false;
            const id = element.getAttribute('id') || '';
            const name = element.getAttribute('name')?.trim() || '';
            const documentation = Array.from(element.children)
              .filter(child => child.localName.toLocaleLowerCase('fr') === 'documentation')
              .map(child => child.textContent?.trim() || '')
              .filter(Boolean).join(' ');
            const annotation = element.localName.toLocaleLowerCase('fr') === 'textannotation'
              ? Array.from(element.children).find(child => child.localName.toLocaleLowerCase('fr') === 'text')?.textContent?.trim() || ''
              : '';
            return id && (matchesTerm(name, term) ||
              matchesTerm(documentation, term) || matchesTerm(annotation, term));
          });

          if (scope === 'all' || scope === 'bpmn') {
            namedElements.forEach(element => {
              const id = element.getAttribute('id') || '';
              const name = element.getAttribute('name')?.trim() || '';
              let kind: string;
            if (element.localName.toLowerCase().includes('subprocess')) {
              kind = 'Sous-processus';
            } else if (element.localName.toLowerCase() === 'lane') {
              kind = 'Lane BPMN';
            } else if (activityTypes.has(element.localName)) {
              kind = 'Activité BPMN';
            } else if (element.localName.toLocaleLowerCase('fr') === 'textannotation') {
              kind = 'Description';
            } else if (element.localName === 'process') {
              kind = 'Processus BPMN';
            } else {
              kind = `Élément BPMN · ${element.localName}`;
            }
              const description = Array.from(element.children)
                .filter(child => child.localName.toLocaleLowerCase('fr') === 'documentation')
                .map(child => child.textContent?.trim() || '')
                .filter(Boolean).join(' ') ||
                (element.localName.toLocaleLowerCase('fr') === 'textannotation'
                  ? Array.from(element.children).find(child => child.localName.toLocaleLowerCase('fr') === 'text')?.textContent?.trim() || ''
                  : '');
              found.push({
                key: `${process.id}:bpmn:${id}`,
                title: element.localName.toLocaleLowerCase('fr') === 'textannotation' ? (description || name || kind) : (name || description || kind),
                detail: `${kind} · ${id}`,
                resourceId: process.id,
                processName: process.name,
                description: description || undefined,
                similarity: similarityFor(`${name} ${description}`, search),
                elementId: element.localName === 'process' ? undefined : id,
              });
            });
          }

          if (scope === 'all' || scope === 'processes') {
            namedElements
              .filter(element => element.localName.toLowerCase().includes('subprocess'))
              .forEach(element => {
                const id = element.getAttribute('id') || '';
                const name = element.getAttribute('name')?.trim() || '';
                found.push({
                  key: `${process.id}:subprocess:${id}`,
                  title: name || 'Sous-processus',
                  detail: `Sous-processus · ${process.name}`,
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
                  detail: 'Rôle',
                  resourceId: process.id,
                  elementId: lane?.getAttribute('id') || undefined,
                  processName: process.name,
                  similarity: similarityFor(role, search),
                  openRaci: true,
                });
              });

            matrix.activities.forEach(activity => {
              activity.cells.forEach(cell => {
                const roleMatches = matchesTerm(cell.role, term);
                const activityMatches = matchesTerm(activity.activity, term);
                const assignmentMatches = cell.codes.some(code => matchesTerm(code, term));
                if (cell.codes.length && (
                  (scope === 'all' && (roleMatches || activityMatches || assignmentMatches)) ||
                  (scope === 'raci' && (roleMatches || activityMatches || assignmentMatches))
                )) {
                  found.push({
                    key: `${process.id}:raci:${activity.elementId}:${cell.role}`,
                    title: activityMatches ? activity.activity : cell.role,
                    detail: `RACI · ${activity.activity} — ${cell.role} (${cell.codes.join('/')})`,
                    resourceId: process.id,
                    elementId: activity.elementId,
                    processName: process.name,
                    similarity: similarityFor(`${activity.activity} ${cell.role} ${cell.codes.join(' ')}`, search),
                    openRaci: true,
                  });
                }
              });
            });
          }

          if (scope === 'all') {
            // Search BPMN documentation, text annotations and communication-related labels.
            const textElements = Array.from(document.getElementsByTagName('*')).filter(element => {
              const tag = element.localName.toLocaleLowerCase('fr');
              const text = element.textContent?.trim() || '';
              const name = element.getAttribute('name') || '';
              const isTextAnnotationChild = tag === 'text' &&
                element.parentElement?.localName.toLocaleLowerCase('fr') === 'textannotation';
              const isTextContent = /documentation|textannotation|text|message|communication|comment/i.test(tag);
              return !isTextAnnotationChild && isTextContent && text &&
                (matchesTerm(text, term) || matchesTerm(name, term));
            });
            textElements.forEach((element, index) => {
              const tag = element.localName.toLocaleLowerCase('fr');
              const isTextAnnotation = tag === 'textannotation';
              const annotationText = isTextAnnotation
                ? Array.from(element.children).find(child => child.localName.toLocaleLowerCase('fr') === 'text')?.textContent
                : undefined;
              const text = (element.getAttribute('name') || annotationText || element.textContent || '').trim().replace(/\s+/g, ' ');
              const title = text.length > 100 ? `${text.slice(0, 97)}…` : text;
              if (!title) return;
              // Resolve documentation to its owning BPMN element for viewer selection.
              let bpmnOwner: Element | null = element;
              while (bpmnOwner && (
                bpmnOwner.namespaceURI !== BPMN_MODEL_NS ||
                !bpmnOwner.getAttribute('id')
              )) {
                bpmnOwner = bpmnOwner.parentElement;
              }
              if (bpmnOwner && BPMN_CONNECTION_TYPES.has(bpmnOwner.localName.toLocaleLowerCase('fr'))) return;

              const elementId = bpmnOwner?.getAttribute('id') || undefined;
              if (bpmnOwner && namedElements.includes(bpmnOwner)) return;
              found.push({
                key: `${process.id}:ia-comm:${element.localName}:${elementId || index}:${title}`,
                title,
                detail: isTextAnnotation || tag === 'documentation'
                  ? `Description · ${elementId || ''}`
                  : `IA comm. / annotation BPMN · ${element.localName}`,
                resourceId: process.id,
                processName: process.name,
                similarity: similarityFor(text, search),
                elementId,
              });
            });
          }
        } catch {
          // An unavailable process must not prevent searching the other processes.
        }
      }));

      if (!cancelled) {
        const uniqueResults = Array.from(new Map(found.map(result => [resultKey(result), result])).values());
        setDeepResults(uniqueResults.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0) || a.title.localeCompare(b.title, 'fr')).slice(0, 20));
        setDeepSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, scope, resources.data, projectProcessIds]);

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

  const openAllResults = () => {
    const term = search.trim();
    if (term.length < 2) return;
    const params = new URLSearchParams({ q: term });
    const typeByScope: Partial<Record<SearchScope, string>> = {
      processes: 'process',
      bpmn: 'bpmn',
      roles: 'actor',
      raci: 'raci',
    };
    const type = typeByScope[scope];
    if (type) params.set('types', type);
    setSearchOpen(false);
    if (activeProjectId) params.set('projectId', activeProjectId);
    navigate(`/search?${params.toString()}`);
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
            setDeepResults([]);
            setSearchOpen(false);
            navigate('/root');
          }}
          disabled={projectsLoading || projects.length === 0}
          aria-label="Projet actif"
          sx={{ minWidth: 180, maxWidth: 240, bgcolor: activeProject?.color || '#263e59', color: '#fff', borderColor: '#40556d', '&:hover': { filter: 'brightness(1.08)' } }}
        >
          {projects.map(project => <Option key={project.id} value={project.id}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, px: 0.5, borderRadius: '6px', bgcolor: project.color || '#2864d7', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
                {getProjectTrigram(project.name)}
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
              {resources.isError && <Typography level="body-sm" color="danger" sx={{ p: 1.5 }}>Recherche indisponible pour le moment.</Typography>}
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
