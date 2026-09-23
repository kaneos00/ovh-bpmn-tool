import { apiClient } from '../../queryClient';
import { getXmlContentQuery } from '../../api/contents/contents.queries';
import { ResourceType } from '../../shared/types/BpmnResource';
import { ContentStatusEnum, type Content, type Resource } from '../../Types';
import type {
  RechercheContext,
  RechercheProvider,
  RechercheResult,
} from './recherche-service';

const MAX_RESOURCES = 100;
const MAX_RESULTS = 50;

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const documentationText = (node: Element) =>
  Array.from(node.querySelectorAll('bpmn\:documentation, documentation'))
    .map(item => item.textContent || '')
    .join(' ');

const scoreResult = (result: RechercheResult, query: string) => {
  const q = normalize(query);
  const fields = [
    normalize(result.name),
    normalize(result.id),
    normalize(result.type),
    normalize(result.documentation),
    normalize(result.processName),
    normalize(result.role),
    normalize(result.raci),
  ];

  if (fields[0] === q) return 100;
  if (fields[1] === q) return 90;
  if (fields[0].startsWith(q)) return 80;
  if (fields[1].startsWith(q)) return 70;
  if (fields[4] === q) return 65;
  if (fields[0].includes(q)) return 60;
  if (fields[1].includes(q)) return 50;
  if (fields[4].includes(q)) return 45;
  if (fields[2].includes(q)) return 30;
  if (fields[5].includes(q) || fields[6].includes(q)) return 20;
  if (fields[3].includes(q)) return 10;
  return 0;
};

const latestSearchableContent = async (resource: Resource) => {
  const contents = (await apiClient.get(
    `/resources/${resource.id}/contents`,
  )) as Content[];

  return (
    contents.find(({ status }) => status === ContentStatusEnum.Published) ||
    contents.find(({ status }) => status === ContentStatusEnum.Draft)
  );
};

const parseProcess = (
  xml: string,
  resource: Resource,
  context: RechercheContext,
): RechercheResult[] => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const nodes = Array.from(document.getElementsByTagName('*')).filter(node =>
    node.localName?.startsWith('task') ||
    [
      'process',
      'startEvent',
      'endEvent',
      'userTask',
      'serviceTask',
      'manualTask',
      'scriptTask',
      'sendTask',
      'receiveTask',
      'businessRuleTask',
      'exclusiveGateway',
      'parallelGateway',
      'inclusiveGateway',
      'complexGateway',
      'eventBasedGateway',
      'subProcess',
      'callActivity',
    ].includes(node.localName),
  );

  return nodes.map(node => {
    const type = node.localName
      ? `bpmn:${node.localName}`
      : '';
    const documentation = documentationText(node);

    return {
      element: undefined,
      id: node.getAttribute('id') || '',
      type,
      name: node.getAttribute('name') || '',
      documentation,
      processId: context.processId,
      processName: resource.name,
      resourceId: resource.id,
      resourceType: resource.type,
      link: `/${resource.id}/modeler`,
      metadata: {
        source: 'repository',
        contentSearch: true,
      },
    };
  });
};

export const createRepositoryRechercheProvider = (): RechercheProvider =>
  async (query, context = {}) => {
    if (context.scope !== 'all-processes') {
      throw new Error('Repository provider is used for all-processes scope only');
    }

    const resources = (await apiClient.get(
      `/resources?filter.type=${ResourceType.Process}&filter.depth=100`,
    )) as Resource[];

    const candidates = resources.slice(0, MAX_RESOURCES);
    const results: RechercheResult[] = [];

    for (const resource of candidates) {
      try {
        const content = await latestSearchableContent(resource);
        if (!content) continue;

        const xml = await apiClient.get(
          `/resources/${resource.id}/contents/${content.id}/content`,
        );

        results.push(...parseProcess(xml, resource, {
          ...context,
          processId: resource.id,
          processName: resource.name,
        }));
      } catch {
        // One unreadable process must not prevent the global search.
      }
    }

    return results
      .map(result => ({ result, score: scoreResult(result, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ result }) => result);
  };
