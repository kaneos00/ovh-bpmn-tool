export enum ProcessChangeRequestStatusEnum {
  Proposed = 'proposed',
  Draft = 'draft',
  InReview = 'in_review',
  ChangesRequested = 'changes_requested',
  Approved = 'approved',
  Rejected = 'rejected',
  Published = 'published',
  Withdrawn = 'withdrawn',
}

export enum ProcessChangeRequestTypeEnum {
  Proposal = 'proposal',
  ContentChange = 'content_change',
}

/**
 * Process lifecycle shown in the explorer/viewer.
 * This is a projection of published content and active change requests,
 * not a second persisted lifecycle competing with ContentStatusEnum.
 */
export enum ProcessLifecycleStatusEnum {
  Unpublished = 'unpublished',
  Published = 'published',
  ModificationInPreparation = 'modification_in_preparation',
  InValidation = 'in_validation',
  ChangesRequested = 'changes_requested',
  ValidationGranted = 'validation_granted',
}
