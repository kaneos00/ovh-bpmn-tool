import { ResourceType } from '../../shared/types/BpmnResource';
import { Resource } from '../../Types';
import { apiClient } from '../../queryClient';

export const QUERY_KEY = 'resources';

export type ExplorerProcessLinks = {\n  resourceId: string;\n  processIds: string[];\n  targets: string[];\n};\n\nexport type ExplorerData = {\n  resources: Resource[];\n  links: ExplorerProcessLinks[];\n};\n\ntype ResourceAttrs = {
  name: string;
  description?: string;
  parentId?: string;
};

type ResourceQueryFilters = {
  type?: ResourceType;
  parentId?: string;
  depth?: number;
};

const buildFilters = (filters: ResourceQueryFilters = {}) => {
  const queryStringParts = [];
  if (filters.type !== undefined) {
    queryStringParts.push(`filter.type=${filters.type}`);
  }
  if (filters.parentId !== undefined) {
    queryStringParts.push(`filter.parentId=${filters.parentId}`);
  }
  if (filters.depth !== undefined) {
    queryStringParts.push(`filter.depth=${filters.depth}`);
  }

  return queryStringParts.join('&');
};

export const resourcesQuery = (filters?: ResourceQueryFilters) => {
  const buildedFilters = buildFilters(filters);
  return {
    queryKey: [QUERY_KEY, buildedFilters],
    queryFn: async (): Promise<Resource[]> =>
      apiClient.get(`/resources?${buildFilters(filters)}`),
  };
};

export const explorerQuery = () => ({\n  queryKey: [QUERY_KEY, 'explorer'],\n  queryFn: async (): Promise<ExplorerData> => apiClient.get('/resources/explorer/links'),\n});\n\nexport const foldersQuery = () => ({
  queryKey: [QUERY_KEY, `type_${ResourceType.Folder}`],
  queryFn: async (): Promise<Resource[]> =>
    apiClient.get(`/resources?filter.type=${ResourceType.Folder}`),
});

export const getResourceQuery = (resourceId: string) => ({
  queryKey: [`${QUERY_KEY}_${resourceId}`],
  queryFn: async (): Promise<Resource> =>
    apiClient.get(`/resources/${resourceId}`),
});

export const createResource = async (resourceAttr: ResourceAttrs) => {
  return apiClient.post('/resources', {
    ...resourceAttr,
    description: resourceAttr.description ?? '',
  });
};

export const updateResource = async (
  resourceId: string,
  resourceAttr: ResourceAttrs,
) => {
  return apiClient.put(`/resources/${resourceId}`, {
    ...resourceAttr,
    description: resourceAttr.description ?? '',
  });
};

export const deleteResource = async (resourceId: string) => {
  return apiClient.remove(`/resources/${resourceId}`);
};


export type ResourceShareProject = {
  id: string;
  name: string;
  canNavigate: boolean;
};

export type ResourceShares = {
  shared: boolean;
  projects: ResourceShareProject[];
};

export const resourceSharesQuery = (resourceId: string) => ({
  queryKey: ['resource-shares', resourceId],
  queryFn: async (): Promise<ResourceShares> =>
    apiClient.get(`/projects/processes/${resourceId}/shares`),
});
