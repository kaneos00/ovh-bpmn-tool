import { apiClient } from '../../queryClient';

export const CHANGE_REQUESTS_QUERY_KEY = 'resources_change_requests';

export const submitProcessChangeRequest = (
  resourceId: string,
  requestId: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/submit`,
    {},
  );
