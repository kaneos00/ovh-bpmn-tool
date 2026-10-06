/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

[ancienne version conservée dans l'historique du commit précédent]

============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { apiClient } from '../../queryClient';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ContentStatusEnum, type Content, type Resource } from '../../Types';
import { RechercheIndex } from './recherche-index';
import type { RechercheProvider, RechercheResult } from './recherche-service';

const MAX_RESOURCES = 100;
const MAX_RESULTS = 50;
const CACHE_TTL_MS = 2 * 60 * 1000;

let resourceCache: { expiresAt: number; resources: Resource[] } | undefined;
const processCache = new Map<string, { expiresAt: number; results: RechercheResult[] }>();
let repositoryIndexCache: { expiresAt: number; index: RechercheIndex } | undefined;

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
  const contents = (await apiClient.get(`/resources/${resource.id}/contents`)) as Content[];
  return contents.find(({ status }) => status === ContentStatusEnum.Published) || contents.find(({ status }) => status === ContentStatusEnum.Draft);
};

const createResourceResult = (resource: Resource, sourceType: 'process' | 'subprocess' = 'process'): RechercheResult => ({
  element: undefined, id: resource.id, type: String(resource.type), name: resource.name,
  documentation: resource.description || '', processId: resource.id, processName: resource.name,
  resourceId: resource.id, resourceType: resource.type, resourceName: resource.name, sourceType,
  link: `/${resource.id}`,
  metadata: { source: 'repository', kind: 'process-resource', depth: resource.depth, parentId: resource.parentId },
});

const parseProcess = (xml: string, resource: Resource): RechercheResult[] => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const nodes = Array.from(document.getElementsByTagName('*')).filter(node =>
    !!node.getAttribute('id') &&
    (!node.namespaceURI || node.namespaceURI.includes('BPMN')),
  );
  return nodes.map(node => {
    const { role, raci } = raciData(node);
    const id = node.getAttribute('id') || '';
    let sourceType: 'role' | 'raci' | 'bpmn' = 'bpmn';
    if (role) {
      sourceType = 'role';
    } else if (raci) {
      sourceType = 'raci';
    }
    return {
      element: undefined, id, type: node.localName ? `bpmn:${node.localName}` : '', name: node.getAttribute('name') || '',
      documentation: documentationText(node), role: role || undefined, raci: raci || undefined,
      processId: resource.id, processName: resource.name, resourceId: resource.id, resourceType: resource.type, resourceName: resource.name,
      sourceType, link: `/${resource.id}?element=${encodeURIComponent(id)}`,
      metadata: { source: 'repository', kind: 'bpmn-element', raci: raci || undefined, role: role || undefined },
    };
  });
};

const getResources = async (): Promise<Resource[]> => {
  if (resourceCache && resourceCache.expiresAt > Date.now()) return resourceCache.resources;
  const url = '/resources?filter.depth=100';
  const raw = await apiClient.get(url);

  const extractResources = (value: any): Resource[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.resources)) return value.resources;
    return [];
  };

  let resources = extractResources(raw);

  // Certains déploiements/API peuvent ne pas appliquer le filtre depth.
  // Si la première requête ne retourne rien, on tente sans depth puis sans filtre,
  // en filtrant localement les processus.
  if (!resources.length) {
    const fallbackUrl = `/resources?filter.type=${ResourceType.Process}`;
    resources = extractResources(await apiClient.get(fallbackUrl));
  }

  if (!resources.length) {
    const allUrl = '/resources';
    resources = extractResources(await apiClient.get(allUrl))
      .filter(resource => resource?.type === ResourceType.Process);
  }

  resources = resources.filter(resource => resource?.type === ResourceType.Process || resource?.type === ResourceType.Folder);
  const limited = resources.slice(0, MAX_RESOURCES);
  resourceCache = { expiresAt: Date.now() + CACHE_TTL_MS, resources: limited };
  repositoryIndexCache = undefined;
  return limited;
};

const getProcessIndex = async (resource: Resource, sourceType: 'process' | 'subprocess'): Promise<RechercheResult[]> => {
  const cached = processCache.get(resource.id);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const content = await latestSearchableContent(resource);
  if (!content) {
    const result = createResourceResult(resource, sourceType);
    processCache.set(resource.id, { expiresAt: Date.now() + CACHE_TTL_MS, results: [result] });
    return [result];
  }
  const xml = await apiClient.get(`/resources/${resource.id}/contents/${content.id}/content`);
  const results = [createResourceResult(resource, sourceType), ...parseProcess(xml, resource)];
  processCache.set(resource.id, { expiresAt: Date.now() + CACHE_TTL_MS, results });
  return results;
};

const getRepositoryIndex = async (): Promise<RechercheIndex> => {
  if (repositoryIndexCache && repositoryIndexCache.expiresAt > Date.now()) return repositoryIndexCache.index;

  const resources = await getResources();
  const byId = new Map(resources.map(resource => [resource.id, resource]));
  const isSubprocess = (resource: Resource) => {
    const visited = new Set<string>();
    let parentId = resource.parentId;

    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) return false;
      if (parent.type === ResourceType.Process) return true;
      parentId = parent.parentId;
    }
    return false;
  };

  const index = new RechercheIndex();
  for (const resource of resources.filter(item => item.type === ResourceType.Process)) {
    const sourceType = isSubprocess(resource) ? 'subprocess' : 'process';
    try {
      index.addMany(await getProcessIndex(resource, sourceType));
    } catch {
      index.add(createResourceResult(resource, sourceType));
    }
  }
  repositoryIndexCache = { expiresAt: Date.now() + CACHE_TTL_MS, index };
  return index;
};

export const getRepositoryRechercheIndex = getRepositoryIndex;

export const invalidateRepositoryRechercheIndex = () => {
  repositoryIndexCache = undefined;
};

export const createRepositoryRechercheProvider = (): RechercheProvider => async (query, context = {}) => {
  if (context.scope !== 'all-processes') {
    throw new Error('Repository provider is used for all-processes scope only');
  }
  const index = await getRepositoryIndex();
  const results = index.search(query, { ...context, processId: undefined, processName: undefined }, MAX_RESULTS);
  return results;
};