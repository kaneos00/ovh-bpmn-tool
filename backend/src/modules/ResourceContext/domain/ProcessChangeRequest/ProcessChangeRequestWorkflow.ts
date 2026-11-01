import {
  ProcessChangeRequestStatusEnum as Status,
  ProcessLifecycleStatusEnum as ProcessStatus,
} from '../../shared/types/ProcessChangeRequest';

export type ProcessChangeRequestState = {
  status: Status;
  authorId: string;
};

/**
 * The workflow is deliberately separate from ContentStatusEnum:
 * a request can be approved while its BPMN content is still only a draft.
 */
const transitions: Record<Status, readonly Status[]> = {
  [Status.Proposed]: [Status.Draft, Status.InReview, Status.Withdrawn],
  [Status.Draft]: [Status.InReview, Status.Withdrawn],
  [Status.InReview]: [
    Status.ChangesRequested,
    Status.Approved,
    Status.Rejected,
    Status.Withdrawn,
  ],
  [Status.ChangesRequested]: [Status.Draft, Status.InReview, Status.Withdrawn],
  [Status.Approved]: [Status.Published, Status.Withdrawn],
  [Status.Rejected]: [],
  [Status.Published]: [],
  [Status.Withdrawn]: [],
};

export class InvalidProcessChangeRequestTransitionError extends Error {
  constructor(from: Status, to: Status) {
    super(`Transition de demande non autorisée : ${from} → ${to}`);
    this.name = 'InvalidProcessChangeRequestTransitionError';
  }
}

export class SelfApprovalNotAllowedError extends Error {
  constructor() {
    super('Un auteur ne peut pas approuver sa propre demande');
    this.name = 'SelfApprovalNotAllowedError';
  }
}

export function assertProcessChangeRequestTransition(
  request: ProcessChangeRequestState,
  nextStatus: Status,
  actorId: string,
  allowSelfApproval = false,
): void {
  if (!transitions[request.status]?.includes(nextStatus)) {
    throw new InvalidProcessChangeRequestTransitionError(
      request.status,
      nextStatus,
    );
  }

  if (
    nextStatus === Status.Approved &&
    !allowSelfApproval &&
    request.authorId === actorId
  ) {
    throw new SelfApprovalNotAllowedError();
  }
}

/**
 * Process status is a projection, never persisted independently.
 * Terminal rejected/withdrawn requests are intentionally ignored.
 */
export function deriveProcessLifecycleStatus(
  hasPublishedContent: boolean,
  requests: readonly ProcessChangeRequestState[],
): ProcessStatus {
  const activeStatuses = new Set(requests.map((request) => request.status));

  if (activeStatuses.has(Status.InReview)) return ProcessStatus.InValidation;
  if (activeStatuses.has(Status.ChangesRequested))
    return ProcessStatus.ChangesRequested;
  if (activeStatuses.has(Status.Approved))
    return ProcessStatus.ValidationGranted;
  if (activeStatuses.has(Status.Draft) || activeStatuses.has(Status.Proposed))
    return ProcessStatus.ModificationInPreparation;
  if (hasPublishedContent) return ProcessStatus.Published;
  return ProcessStatus.Unpublished;
}
