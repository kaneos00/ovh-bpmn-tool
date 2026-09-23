import { apiClient } from '../../queryClient';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ContentStatusEnum, type Content, type Resource } from '../../Types';
import type {
  RechercheContext,
  RechercheProvider,
  RechercheResult,
} from './recherche-service';

const MAX_RESOURCES = 100;
const MAX_RESULTS = 50;
const CACHE_TTL_MS = 2 * 60 * 1000;

let resourceCache: { expiresAt: number; resources: Resource[] } | undefined;
const processCache = new Map<string, { expiresAt: number; results: RechercheResult[] }>();

const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const documentationText = (node: Element) =>
  Array.from(node.querySelectorAll('bpmn\\:documentation, documentation')).map(item => item.textContent || '').join(' ');

const attributeText = (node: Element, names: string[]) =>
  names.flatMap(name => [node.getAttribute(name), node.getAttribute(`camunda:${name}`)]).filter(Boolean).join(', ');

const raciData = (node: Element) => ({
  role: attributeText(node, ['assignee', 'candidateGroup', 'candidateGroups', 'candidateUser', 'candidateUsers', 'owner', 'role']),
  raci: attributeText(node, ['raci', 'responsible', 'accountable', 'consulted', 'informed']),
});

const scoreResult = (result: RechercheResult, query: string) => {
  const q = normalize(query);
  const fields = [normalize(result.name), normalize(result.id), normalize(result.type), normalize(result.documentation), normalize(result.processName), normalize(result.resourceName), normalize(result.role), normalize(result.raci)];
  if (fields[0] === q) return 100;
  if (fields[1] === q) return 90;
  if (fields[0].startsWith(q)) return 80;
  if (fields[1].startsWith(q)) return 70;
  if (fields[4] === q || fields[5] === q) return 65;
  if (fields[0].includes(q)) return 60;
  if (fields[1].includes(q)) return 50;
  if (fields[4].includes(q) || fields[5].includes(q)) return 45;
  if (fields[2].includes(q)) return 30;
  if (fields[6].includes(q) || fields[7].includes(q)) return 20;
  if (fields[3].includes(q)) return 10;
  return 0;
};

const latestSearchableContent = async (resource: Resource) => {
  const contents = (await apiClient.get(`/resources/${resource.id}/contents`)) as Content[];
  return contents.find(({ status }) => status === ContentStatusEnum.Published) || contents.find(({ status }) => status === ContentStatusEnum.Draft);
};

const createResourceResult = (resource: Resource, context: RechercheContext): RechercheResult => ({
  element: undefined,
  id: resource.id,
  type: String(resource.type),
  name: resource.name,
  documentation: resource.description || '',
  processId: resource.id,
  processName: resource.name,
  resourceId: resource.id,
  resourceType: resource.type,
  resourceName: resource.name,
  sourceType: 'process',
  link: `/${resource.id}/modeler`,
  metadata: { source: 'repository', kind: 'process-resource', depth: resource.depth, parentId: resource.parentId, ...context },
});

const parseProcess = (xml: string, resource: Resource, context: RechercheContext): RechercheResult[] => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const nodes = Array.from(document.getElementsByTagName('*')).filter(node => node.localName?.startsWith('task') || ['process', 'startEvent', 'endEvent', 'userTask', 'serviceTask', 'manualTask', 'scriptTask', 'sendTask', 'receiveTask', 'businessRuleTask', 'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'complexGateway', 'eventBasedGateway', 'subProcess', 'callActivity'].includes(node.localName));
  return nodes.map(node => {
    const { role, raci } = raciData(node);
    const id = node.getAttribute('id') || '';
    const sourceType = role ? 'role' : raci ? 'raci' : 'bpmn';
    return {
      element: undefined,
      id,
      type: node.localName ? `bpmn:${node.localName}` : '',
      name: node.getAttribute('name') || '',
      documentation: documentationText(node),
      role: role || undefined,
      raci: raci || undefined,
      processId: context.processId,
      processName: resource.name,
      resourceId: resource.id,
      resourceType: resource.type,
      resourceName: resource.name,
      sourceType,
      link: `/${resource.id}/modeler?element=${encodeURIComponent(id)}`,
      metadata: { source: 'repository', kind: 'bpmn-element', raci: raci || undefined, role: role || undefined },
    };
  });
};

const getResources = async (): Promise<Resource[]> => {
  if (resourceCache && resourceCache.expiresAt > Date.now()) return resourceCache.resources;
  const resources = (await apiClient.get(`/resources?filter.type=${ResourceType.Process}&filter.depth=100`)) as Resource[];
  const limited = resources.slice(0, MAX_RESOURCES);
  resourceCache = { expiresAt: Date.now() + CACHE_TTL_MS, resources: limited };
  return limited;
};

const getProcessIndex = async (resource: Resource, context: RechercheContext): Promise<RechercheResult[]> => {
  const cached = processCache.get(resource.id);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const content = await latestSearchableContent(resource);
  if (!content) return [createResourceResult(resource, context)];
  const xml = await apiClient.get(`/resources/${resource.id}/contents/${content.id}/content`);
  const results = [createResourceResult(resource, context), ...parseProcess(xml, resource, { ...context, processId: resource.id, processName: resource.name })];
  processCache.set(resource.id, { expiresAt: Date.now() + CACHE_TTL_MS, results });
  return results;
};

export const createRepositoryRechercheProvider = (): RechercheProvider => async (query, context = {}) => {
  if (context.scope !== 'all-processes') throw new Error('Repository provider is used for all-processes scope only');
  const resources = await getResources();
  const results: RechercheResult[] = [];
  for (const resource of resources) {
    try { results.push(...await getProcessIndex(resource, context)); }
    catch { results.push(createResourceResult(resource, context)); }
  }
  return results.map(result => ({ result, score: scoreResult(result, query) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS).map(({ result }) => result);
};
