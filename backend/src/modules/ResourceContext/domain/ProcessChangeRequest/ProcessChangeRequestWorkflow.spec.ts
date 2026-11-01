import {
  assertProcessChangeRequestTransition,
  deriveProcessLifecycleStatus,
  InvalidProcessChangeRequestTransitionError,
  SelfApprovalNotAllowedError,
} from './ProcessChangeRequestWorkflow';
import {
  ProcessChangeRequestStatusEnum as RequestStatus,
  ProcessLifecycleStatusEnum as ProcessStatus,
} from '../../shared/types/ProcessChangeRequest';

describe('ProcessChangeRequestWorkflow', () => {
  it('keeps technical content lifecycle separate and derives in-review process status', () => {
    expect(
      deriveProcessLifecycleStatus(true, [
        { status: RequestStatus.InReview, authorId: 'author-1' },
      ]),
    ).toBe(ProcessStatus.InValidation);
  });

  it('prioritizes an active review over correction and draft requests', () => {
    expect(
      deriveProcessLifecycleStatus(true, [
        { status: RequestStatus.Draft, authorId: 'author-1' },
        { status: RequestStatus.ChangesRequested, authorId: 'author-2' },
        { status: RequestStatus.InReview, authorId: 'author-3' },
      ]),
    ).toBe(ProcessStatus.InValidation);
  });

  it('does not let rejected or withdrawn requests mask the published process', () => {
    expect(
      deriveProcessLifecycleStatus(true, [
        { status: RequestStatus.Rejected, authorId: 'author-1' },
        { status: RequestStatus.Withdrawn, authorId: 'author-2' },
      ]),
    ).toBe(ProcessStatus.Published);
  });

  it('requires an explicit approval before publication', () => {
    expect(() =>
      assertProcessChangeRequestTransition(
        { status: RequestStatus.InReview, authorId: 'author-1' },
        RequestStatus.Published,
        'reviewer-1',
      ),
    ).toThrow(InvalidProcessChangeRequestTransitionError);
  });

  it('prevents an author from approving their own request by default', () => {
    expect(() =>
      assertProcessChangeRequestTransition(
        { status: RequestStatus.InReview, authorId: 'author-1' },
        RequestStatus.Approved,
        'author-1',
      ),
    ).toThrow(SelfApprovalNotAllowedError);
  });

  it('allows self-approval only when explicitly configured', () => {
    expect(() =>
      assertProcessChangeRequestTransition(
        { status: RequestStatus.InReview, authorId: 'author-1' },
        RequestStatus.Approved,
        'author-1',
        true,
      ),
    ).not.toThrow();
  });
});
