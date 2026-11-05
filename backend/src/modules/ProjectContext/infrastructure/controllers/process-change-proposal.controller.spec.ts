import { ForbiddenException } from '@nestjs/common';
import { ProjectMemberRole } from '../entities/projectMember.ormEntity';
import {
  ProcessChangeProposalStatus,
  ProcessChangeProposalTypeOrmEntity,
} from '../entities/processChangeProposal.ormEntity';
import {
  ProcessChangeProposalCommentStatus,
  ProcessChangeProposalCommentTypeOrmEntity,
} from '../entities/processChangeProposalComment.ormEntity';
import { ProcessChangeProposalEventTypeOrmEntity } from '../entities/processChangeProposalEvent.ormEntity';
import { ProjectMemberTypeOrmEntity } from '../entities/projectMember.ormEntity';
import { ProcessChangeProposalController } from './process-change-proposal.controller';

describe('ProcessChangeProposalController remark permissions', () => {
  const actorUsername = 'reviewer';
  const actorUserId = '00000000-0000-4000-8000-000000000001';
  const authorUserId = '00000000-0000-4000-8000-000000000002';
  const proposalId = '00000000-0000-4000-8000-000000000003';
  const commentId = '00000000-0000-4000-8000-000000000004';

  const makeController = (
    membership: { role: ProjectMemberRole } | null,
    isOrganizationAdmin = false,
    remarkAuthorUserId = authorUserId,
  ) => {
    const proposal = {
      id: proposalId,
      projectId: 'project-1',
      validatorUserId: actorUserId,
      status: ProcessChangeProposalStatus.Submitted,
    };
    const remark = {
      id: commentId,
      proposalId,
      elementId: 'Task_Review',
      authorUserId: remarkAuthorUserId,
      comment: 'Vérifier cette étape',
      status: ProcessChangeProposalCommentStatus.Pending,
      decisionBy: null,
      decidedAt: null,
      decisionComment: null,
    };
    const proposals = {
      findOne: jest.fn().mockResolvedValue(proposal),
    };
    const comments = {
      findOne: jest.fn().mockResolvedValue(remark),
      save: jest.fn(async (value: unknown) => value),
    };
    const events = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
    };
    const members = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          membership
            ? { projectId: 'project-1', userId: actorUsername, ...membership }
            : null,
        ),
    };
    const repositories = new Map<unknown, unknown>([
      [ProcessChangeProposalTypeOrmEntity, proposals],
      [ProcessChangeProposalCommentTypeOrmEntity, comments],
      [ProcessChangeProposalEventTypeOrmEntity, events],
      [ProjectMemberTypeOrmEntity, members],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ id: actorUserId }]),
      transaction: jest.fn(async (work: (value: unknown) => unknown) =>
        work(manager),
      ),
    };
    const access = {
      getAuthenticatedUserId: jest.fn(() => actorUsername),
      hasOrganizationAdminRole: jest.fn(() => isOrganizationAdmin),
    };
    const controller = new ProcessChangeProposalController(
      dataSource as never,
      access as never,
      proposals as never,
      events as never,
      comments as never,
      {} as never,
      {} as never,
      members as never,
      {} as never,
    );
    return { controller, events, comments, proposals, remark };
  };

  const assertCanDecide = async (
    membership: { role: ProjectMemberRole } | null,
    isOrganizationAdmin: boolean,
    validatorUserId: string,
    expectedActorRole: string,
  ) => {
    const { controller, events, comments, proposals } = makeController(
      membership,
      isOrganizationAdmin,
    );
    proposals.findOne.mockResolvedValue({
      id: proposalId,
      projectId: 'project-1',
      validatorUserId,
      status: ProcessChangeProposalStatus.Submitted,
    });

    await expect(
      controller.decideProposalComment(
        proposalId,
        commentId,
        { decision: 'accepted', comment: 'Contrôlé' },
        { 'x-user': actorUsername },
      ),
    ).resolves.toMatchObject({
      id: commentId,
      status: ProcessChangeProposalCommentStatus.Accepted,
      decisionBy: actorUserId,
    });
    expect(comments.save).toHaveBeenCalled();
    expect(events.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'remark_accepted',
        actorUserId,
        details: expect.objectContaining({ actorRole: expectedActorRole }),
      }),
    );
  };

  it('allows the designated validator to decide a remark', async () => {
    await assertCanDecide(
      { role: ProjectMemberRole.Modeler },
      false,
      actorUserId,
      'designated_validator',
    );
  });

  it('allows the project manager to decide a remark as project administrator', async () => {
    await assertCanDecide(
      { role: ProjectMemberRole.Admin },
      false,
      '00000000-0000-4000-8000-000000000099',
      'project_admin',
    );
  });

  it('allows the global administrator to decide a remark', async () => {
    await assertCanDecide(
      null,
      true,
      '00000000-0000-4000-8000-000000000099',
      'organization_admin',
    );
  });

  it('does not allow a viewer to decide a remark', async () => {
    const { controller } = makeController({ role: ProjectMemberRole.Viewer });
    await expect(
      controller.decideProposalComment(
        proposalId,
        commentId,
        { decision: 'accepted' },
        { 'x-user': actorUsername },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow even a global administrator to decide their own remark', async () => {
    const { controller } = makeController(null, true, actorUserId);
    await expect(
      controller.decideProposalComment(
        proposalId,
        commentId,
        { decision: 'accepted' },
        { 'x-user': actorUsername },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
