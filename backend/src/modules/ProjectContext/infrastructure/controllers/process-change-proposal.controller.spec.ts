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
import { ProjectProcessUsage } from '../entities/projectProcess.ormEntity';
import { ResourceTypeEnum } from '../../../ResourceContext/shared/types/Resource';
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
    usage: ProjectProcessUsage = ProjectProcessUsage.Variant,
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
    const projectProcesses = {
      findOne: jest.fn().mockResolvedValue({
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage,
      }),
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
      projectProcesses as never,
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

  it('allows the contribution workflow to process remarks on a common process without changing its project usage', async () => {
    const { controller, comments, events } = makeController(
      { role: ProjectMemberRole.Admin },
      false,
      authorUserId,
      ProjectProcessUsage.Common,
    );
    await expect(
      controller.decideProposalComment(
        proposalId,
        commentId,
        { decision: 'accepted' },
        { 'x-user': actorUsername },
      ),
    ).resolves.toMatchObject({
      id: commentId,
      status: ProcessChangeProposalCommentStatus.Accepted,
    });
    expect(comments.save).toHaveBeenCalled();
    expect(events.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'remark_accepted' }),
    );
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

describe('ProcessChangeProposalController common-process remark creation', () => {
  it('creates a distinct private proposal workspace without adding a second project link', async () => {
    const projectId = '10000000-0000-4000-8000-000000000001';
    const sourceId = '20000000-0000-4000-8000-000000000002';
    const cloneId = '20000000-0000-4000-8000-000000000003';
    const publishedId = '30000000-0000-4000-8000-000000000001';
    const draftId = '30000000-0000-4000-8000-000000000002';
    const authorId = '4e08285c-d198-407d-b729-6e54b57f9873';
    const proposalId = '40000000-0000-4000-8000-000000000001';
    const username = 'auteur-1';
    const membership = {
      projectId,
      userId: username,
      role: ProjectMemberRole.Viewer,
      canSubmitRemarks: true,
    };
    const source = {
      id: sourceId,
      name: 'Processus commun',
      description: null,
      depth: 0,
      parentId: null,
      type: ResourceTypeEnum.Process,
      authToken: null,
    };
    const resourceRepository = {
      findOne: jest.fn().mockResolvedValue(source),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: cloneId,
      })),
    };
    const contentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: publishedId,
        resourceId: sourceId,
        content: '<definitions />',
        version: 1,
      }),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: draftId,
      })),
    };
    const linkRepository = {
      findOne: jest.fn().mockResolvedValue({
        projectId,
        resourceId: sourceId,
        usage: ProjectProcessUsage.Common,
      }),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
    };
    const memberRepository = {
      findOne: jest.fn().mockResolvedValue(membership),
      find: jest.fn().mockResolvedValue([]),
    };
    const proposalRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: proposalId,
      })),
    };
    const eventRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
    };
    const commentRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: '50000000-0000-4000-8000-000000000001',
      })),
    };
    const repositories = new Map<unknown, unknown>([
      [ResourceTypeOrmEntity, resourceRepository],
      [ContentTypeOrmEntity, contentRepository],
      [ProjectProcessTypeOrmEntity, linkRepository],
      [ProjectMemberTypeOrmEntity, memberRepository],
      [ProcessChangeProposalTypeOrmEntity, proposalRepository],
      [ProcessChangeProposalEventTypeOrmEntity, eventRepository],
      [ProcessChangeProposalCommentTypeOrmEntity, commentRepository],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
      query: jest.fn().mockResolvedValue([]),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ id: authorId }]),
      transaction: jest.fn(async (work: (value: unknown) => unknown) =>
        work(manager),
      ),
    };
    const access = {
      getAuthenticatedUserId: jest.fn(() => username),
      hasOrganizationAdminRole: jest.fn(() => false),
      assertCanReadResource: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new ProcessChangeProposalController(
      dataSource as never,
      access as never,
      proposalRepository as never,
      eventRepository as never,
      commentRepository as never,
      {} as never,
      linkRepository as never,
      memberRepository as never,
      resourceRepository as never,
    );

    const result = await controller.createProposal(
      projectId,
      sourceId,
      { elementId: 'Task_Review', comment: 'Verificare questa attività' },
      { 'x-user': username },
    );

    expect(resourceRepository.save).toHaveBeenCalledTimes(1);
    expect(result.cloneResourceId).toBe(cloneId);
    expect(result.cloneResourceId).not.toBe(sourceId);
    expect(proposalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceResourceId: sourceId,
        cloneResourceId: cloneId,
      }),
    );
    expect(linkRepository.save).not.toHaveBeenCalled();
    expect(commentRepository.save).toHaveBeenCalled();
  });
});
