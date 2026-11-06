import { apiClient } from '../../queryClient';

export type UnifiedSearchType = 'process' | 'bpmn' | 'raci' | 'actor';
export type UnifiedSearchSource =
  | 'resource'
  | 'bpmn'
  | 'project-raci'
  | 'project-actor';
export type UnifiedSearchRole = 'R' | 'A' | 'C' | 'I';

export type UnifiedSearchResult = {
  type: UnifiedSearchType;
  id: string;
  label: string;
  excerpt: string;
  description?: string;
  field: string;
  resourceId?: string;
  processName?: string;
  elementId?: string;
  projectId?: string;
  role?: UnifiedSearchRole;
  source?: UnifiedSearchSource;
  matchKind?: 'exact' | 'approximate';
  matchScore?: number;
};

export type UnifiedSearchResponse = {
  query: string;
  total: number;
  offset: number;
  limit: number;
  results: UnifiedSearchResult[];
  coverage: {
    readableProcesses: number;
    bpmnDocumentsAvailable: number;
    bpmnDocumentsScanned: number;
    bpmnDocumentsSkipped: number;
    partial: boolean;
  };
};

export type UnifiedSearchParams = {
  q: string;
  types?: UnifiedSearchType[];
  source?: UnifiedSearchSource;
  resourceId?: string;
  projectId?: string;
  role?: UnifiedSearchRole;
  limit?: number;
  offset?: number;
};

export const unifiedSearchQuery = (params: UnifiedSearchParams) => {
  const query = new URLSearchParams({ q: params.q });
  if (params.types?.length) query.set('types', params.types.join(','));
  if (params.source) query.set('source', params.source);
  if (params.resourceId) query.set('resourceId', params.resourceId);
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.role) query.set('role', params.role);
  query.set('limit', String(params.limit ?? 30));
  query.set('offset', String(params.offset ?? 0));

  return {
    queryKey: ['unified-search', params],
    queryFn: async (): Promise<UnifiedSearchResponse> =>
      apiClient.get(`/search?${query.toString()}`),
  };
};
