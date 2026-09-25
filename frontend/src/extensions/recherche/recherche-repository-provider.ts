import { apiClient } from '../../queryClient';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ContentStatusEnum, type Content, type Resource } from '../../Types';
import { RechercheIndex } from './recherche-index';
import type { RechercheProvider, RechercheResult } from './recherche-service';

const MAX_RESOURCES = 100;

const appPath = (path: string) => {
  const basePath = String(import.meta.env.VITE_APP_BASE_PATH || '').replace(/\/$/, '');
  return `${basePath}/${path.replace(/^\//, '')}`;
};
const MAX_RESULTS = 50;
const CACHE_TTL_MS = 2 * 60 * 1000;

let resourceCache: { expiresAt: number; resources: Resource[] } | undefined;
const processCache = new Map<string, { expiresAt: number; results: RechercheResult[] }>();
let repositoryIndexCache: { expiresAt: number; index: RechercheIndex } | undefined;

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    for (const key of ['items', 'resources', 'contents', 'data']) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate as T[];

      if (candidate && typeof candidate === 'object') {
        const nested = asArray<T>(candidate);
        if (nested.length > 0) return nested;
      }
    }
  }

  return [];
};

const documentationText = (node: Element) =>
  Array.from(node.querySelectorAll('bpmn\\:documentation, documentation'))
    .map(item => item.textContent || '')
    .join(' ');

const attributeText = (node: Element, names: string[]) =>
  names
    .flatMap(name => [node.getAttribute(name), node.getAttribute(`camunda:${name}`)])
    .filter(Boolean)
    .join(', ');

const raciData = (node: Element) => ({
  role: attributeText(node, ['assignee', 'candidateGroup', 'candidateGroups', 'candidateUser', 'candidateUsers', 'owner', 'role']),
  raci: attributeText(node, ['raci', 'responsible', 'accountable', 'consulted', 'informed']),
});

const latestSearchableContent = async (resource: Resource) => {
  const rawContents = await apiClient.get(`/resources/${resource.id}/contents`);
  const contents = asArray<Content>(rawContents);
  return (
    contents.find(({ status }) => status === ContentStatusEnum.Published) ||
    contents.find(({ status }) => status === ContentStatusEnum.Draft)
  );
};

const createResourceResult = (resource: Resource): RechercheResult => ({
  element: undefined, id: resource.id, type: String(resource.type), name: resource.name,
  documentation: resource.description || '', processId: resource.id, processName: resource.name,
  resourceId: resource.id, resourceType: resource.type, resourceName: resource.name, sourceType: 'process',
  link: appPath(`/${resource.id}`),
  metadata: { source: 'repository', kind: 'process-resource', depth: resource.depth, parentId: resource.parentId },
});

const parseProcess = (xml: string, resource: Resource): RechercheResult[] => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const nodes = Array.from(document.getElementsByTagName('*')).filter(node =>
    node.localName?.startsWith('task') || ['process','startEvent','endEvent','userTask','serviceTask','manualTask','scriptTask','sendTask','receiveTask','businessRuleTask','exclusiveGateway','parallelGateway','inclusiveGateway','complexGateway','eventBasedGateway','subProcess','callActivity'].includes(node.localName),
  );
  return nodes.map(node => {
    const { role, raci } = raciData(node);
    const id = node.getAttribute('id') || '';
    const sourceType = role ? 'role' : raci ? 'raci' : 'bpmn';
    return {
      element: undefined, id, type: node.localName ? `bpmn:${node.localName}` : '', name: node.getAttribute('name') || '',
      documentation: documentationText(node), role: role || undefined, raci: raci || undefined,
      processId: resource.id, processName: resource.name, resourceId: resource.id, resourceType: resource.type, resourceName: resource.name,
      sourceType, link: appPath(`/${resource.id}/modeler?element=${encodeURIComponent(id)}`),
      metadata: { source: 'repository', kind: 'bpmn-element', raci: raci || undefined, role: role || undefined },
    };
  });
};

const getResources = async (): Promise<Resource[]> => {
  const cacheValid = Boolean(resourceCache && resourceCache.expiresAt > Date.now());
  console.info('[Recherche] repository:resources:request', {
    cacheValid,
    cachedCount: resourceCache?.resources.length ?? 0,
  });
  if (cacheValid) return resourceCache!.resources;
  const rawResources = await apiClient.get(
    `/resources?filter.type=${ResourceType.Process}`,
  );
  const resources = asArray<Resource>(rawResources);

  console.info('[Recherche] repository:resources', {
    rawType: typeof rawResources,
    rawKeys:
      rawResources && typeof rawResources === 'object'
        ? Object.keys(rawResources)
        : [],
    count: resources.length,
  });
  const limited = resources.slice(0, MAX_RESOURCES);
  if (limited.length > 0) {
    resourceCache = { expiresAt: Date.now() + CACHE_TTL_MS, resources: limited };
  } else {
    resourceCache = undefined;
  }
  repositoryIndexCache = undefined;
  return limited;
};

const getProcessIndex = async (resource: Resource): Promise<RechercheResult[]> => {
  const cached = processCache.get(resource.id);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const content = await latestSearchableContent(resource);
  if (!content) {
    const result = createResourceResult(resource);
    processCache.set(resource.id, { expiresAt: Date.now() + CACHE_TTL_MS, results: [result] });
    return [result];
  }
  const xml = await apiClient.get(`/resources/${resource.id}/contents/${content.id}/content`);
  const results = [createResourceResult(resource), ...parseProcess(xml, resource)];
  processCache.set(resource.id, { expiresAt: Date.now() + CACHE_TTL_MS, results });
  return results;
};

const getRepositoryIndex = async (): Promise<RechercheIndex> => {
  const cacheValid = Boolean(repositoryIndexCache && repositoryIndexCache.expiresAt > Date.now());
  console.info('[Recherche] repository:index:request', {
    cacheValid,
    cachedEntries: repositoryIndexCache?.index.all().length ?? 0,
  });
  if (cacheValid) return repositoryIndexCache!.index;

  const resources = await getResources();
  const index = new RechercheIndex();
  console.info('[Recherche] repository:index:start', {
    resources: resources.length,
  });
  for (const resource of resources) {
    try {
      index.addMany(await getProcessIndex(resource));
    } catch {
      index.add(createResourceResult(resource));
    }
  }
  if (index.all().length > 0) {
    repositoryIndexCache = { expiresAt: Date.now() + CACHE_TTL_MS, index };
  } else {
    repositoryIndexCache = undefined;
  }
  console.info('[Recherche] repository:index:done', {
    entries: index.all().length,
    sample: index.all().slice(0, 3),
  });
  return index;
};

export const getRepositoryRechercheIndex = getRepositoryIndex;

export const invalidateRepositoryRechercheIndex = () => {
  repositoryIndexCache = undefined;
};

export const createRepositoryRechercheProvider = (): RechercheProvider => async (query, context = {}) => {
  const index = await getRepositoryIndex();
  const results = index.search(query, {
    ...context,
    processId: context.scope === 'current-process' ? context.processId : undefined,
    processName: context.scope === 'current-process' ? context.processName : undefined,
  }, MAX_RESULTS);
  console.info('[Recherche] repository:search', {
    query,
    context,
    entries: index.all().length,
    count: results.length,
    results,
  });
  return results;
};