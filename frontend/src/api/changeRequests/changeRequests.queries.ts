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

export type ProcessChangeRequestStatus =
  | 'proposed'
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'withdrawn';

export type ProcessChangeRequest = {
  id: string;
  authorId: string;
  status: ProcessChangeRequestStatus;
  title: string;
  description: string;
  justification: string | null;
  assignedReviewerId: string | null;
  workingContentId: string | null;
  sourceVersion: number | null;
  createdAt: string;
};

export const processChangeRequestsQuery = (resourceId: string) => ({
  queryKey: [`${CHANGE_REQUESTS_QUERY_KEY}_${resourceId}`],
  queryFn: async (): Promise<ProcessChangeRequest[]> =>
    apiClient.get(`/resources/${resourceId}/change-requests`),
});

export const createProcessChangeRequestProposal = (
  resourceId: string,
  payload: { title: string; description: string; justification?: string },
) =>
  apiClient.post(`/resources/${resourceId}/change-requests`, payload);

export const startProcessChangeRequestEditing = (
  resourceId: string,
  requestId: string,
  description: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/start-editing`,
    { description },
  );

export const resumeProcessChangeRequestEditing = (
  resourceId: string,
  requestId: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/resume-editing`,
    {},
  );

export const assignProcessChangeRequestReviewer = (
  resourceId: string,
  requestId: string,
  reviewerId: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/assign-reviewer`,
    { reviewerId },
  );

export const requestProcessChangeRequestChanges = (
  resourceId: string,
  requestId: string,
  comment: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/request-changes`,
    { comment },
  );

export const approveProcessChangeRequest = (
  resourceId: string,
  requestId: string,
  comment?: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/approve`,
    { comment },
  );

export const rejectProcessChangeRequest = (
  resourceId: string,
  requestId: string,
  comment: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/reject`,
    { comment },
  );

export const publishApprovedProcessChangeRequest = (
  resourceId: string,
  requestId: string,
  pngContent: string,
) =>
  apiClient.post(
    `/resources/${resourceId}/change-requests/${requestId}/publish`,
    { pngContent },
  );
