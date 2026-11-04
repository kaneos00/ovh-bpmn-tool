import { randomBytes, randomUUID } from 'crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ResourceTypeEnum } from '../../../ResourceContext/shared/types/Resource';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';
import {
  ProjectMemberRole,
  ProjectMemberTypeOrmEntity,
} from '../entities/projectMember.ormEntity';
import {
  ProjectProcessTypeOrmEntity,
  ProjectProcessUsage,
} from '../entities/projectProcess.ormEntity';
import { ProjectTypeOrmEntity } from '../entities/project.ormEntity';
import {
  ProcessChangeProposalStatus,
  ProcessChangeProposalTypeOrmEntity,
} from '../entities/processChangeProposal.ormEntity';
import { ProcessChangeProposalEventTypeOrmEntity } from '../entities/processChangeProposalEvent.ormEntity';
import {
  ProcessChangeProposalCommentStatus,
  ProcessChangeProposalCommentTypeOrmEntity,
} from '../entities/processChangeProposalComment.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

@Controller('projects')
export class ProcessChangeProposalController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: ProjectResourceAccessService,
    @InjectRepository(ProcessChangeProposalTypeOrmEntity)
    private readonly proposals: Repository<ProcessChangeProposalTypeOrmEntity>,
    @InjectRepository(ProcessChangeProposalEventTypeOrmEntity)
    private readonly events: Repository<ProcessChangeProposalEventTypeOrmEntity>,
    @InjectRepository(ProcessChangeProposalCommentTypeOrmEntity)
    private readonly proposalComments: Repository<ProcessChangeProposalCommentTypeOrmEntity>,
    @InjectRepository(ProjectTypeOrmEntity)
    private readonly projects: Repository<ProjectTypeOrmEntity>,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ProjectMemberTypeOrmEntity)
    private readonly members: Repository<ProjectMemberTypeOrmEntity>,
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resources: Repository<ResourceTypeOrmEntity>,
  ) {}

  /**
   * Personal cross-project view. It deliberately returns only proposals authored
   * by the authenticated user and only while that user retains project access.
   */
  @Get('me/process-change-proposals')
  @UseAcl()
  async listMyProposals(@Headers() headers: RequestHeaders) {
    const username = this.access.getAuthenticatedUserId(headers);
    const userId = await this.resolveAccountId(username);
    const authored = await this.proposals.find({
      where: { authorUserId: userId },
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!authored.length) return [];

    const projectIds = [
      ...new Set(authored.map((proposal) => proposal.projectId)),
    ];
    const [memberships, projects, links, resources] = await Promise.all([
      this.members.find({
        where: { userId: username, projectId: In(projectIds) },
      }),
      this.projects.find({
        where: { id: In(projectIds) },
      }),
      this.projectProcesses.find({
        where: { projectId: In(projectIds) },
      }),
      this.resources.find({
        where: {
          id: In(authored.map((proposal) => proposal.sourceResourceId)),
        },
      }),
    ]);
    const membershipIds = new Set(
      memberships.map((membership) => membership.projectId),
    );
    const projectById = new Map(
      projects.map((project) => [project.id, project]),
    );
    const resourceById = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    const linkByKey = new Map(
      links.map((link) => [`${link.projectId}:${link.resourceId}`, link]),
    );
    const visible = authored.filter(
      (proposal) =>
        membershipIds.has(proposal.projectId) &&
        linkByKey.has(`${proposal.projectId}:${proposal.sourceResourceId}`),
    );
    if (!visible.length) return [];

    const events = await this.events.find({
      where: { proposalId: In(visible.map((proposal) => proposal.id)) },
      order: { createdAt: 'DESC' },
    });
    const validatorIds = [
      ...new Set(
        visible
          .map((proposal) => proposal.validatorUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const validatorRows: Array<{
      id: string;
      username: string;
      email: string | null;
    }> = validatorIds.length
      ? await this.dataSource.query(
          'SELECT id, username, email FROM app_users WHERE id = ANY($1::uuid[])',
          [validatorIds],
        )
      : [];
    const validatorById = new Map(
      validatorRows.map((validator) => [
        validator.id,
        validator.username || validator.email || validator.id,
      ]),
    );
    const latestEventByProposal = new Map<
      string,
      ProcessChangeProposalEventTypeOrmEntity
    >();
    for (const event of events) {
      if (!latestEventByProposal.has(event.proposalId)) {
        latestEventByProposal.set(event.proposalId, event);
      }
    }

    return visible.map((proposal) => {
      const latestEvent = latestEventByProposal.get(proposal.id);
      const project = projectById.get(proposal.projectId);
      const resource = resourceById.get(proposal.sourceResourceId);
      return {
        id: proposal.id,
        projectId: proposal.projectId,
        projectName: project?.name ?? 'Projet indisponible',
        sourceResourceId: proposal.sourceResourceId,
        processName: resource?.name ?? 'Processus indisponible',
        cloneResourceId: proposal.cloneResourceId,
        submittedContentId: proposal.submittedContentId,
        authorUserId: proposal.authorUserId,
        validatorUserId: proposal.validatorUserId,
        validatorName: proposal.validatorUserId
          ? (validatorById.get(proposal.validatorUserId) ?? null)
          : null,
        status: proposal.status,
        submissionComment: proposal.submissionComment,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        submittedAt: proposal.submittedAt,
        decidedAt: proposal.decidedAt,
        latestActivityAt: latestEvent?.createdAt ?? proposal.updatedAt,
        latestActivityType: latestEvent?.eventType ?? 'created',
        latestActivityComment: latestEvent?.comment ?? null,
        validatorWarning:
          typeof latestEvent?.details?.validatorWarning === 'string'
            ? latestEvent.details.validatorWarning
            : null,
      };
    });
  }

  /**
   * Cross-project review queue for the authenticated validator.
   * A designated validator must still be an active project modeler/admin;
   * project admins and organization admins may review as fallback.
   */
  @Get('me/process-change-proposals/to-review')
  @UseAcl()
  async listProposalsToReview(@Headers() headers: RequestHeaders) {
    const username = this.access.getAuthenticatedUserId(headers);
    const userId = await this.resolveAccountId(username);
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    const memberships = await this.members.find({
      where: { userId: username },
    });
    const membershipByProject = new Map(
      memberships.map((membership) => [membership.projectId, membership]),
    );
    if (!isOrganizationAdmin && !memberships.length) return [];

    const reviewable = await this.proposals.find({
      where: [
        { status: ProcessChangeProposalStatus.Submitted },
        { status: ProcessChangeProposalStatus.Approved },
      ],
      order: { submittedAt: 'DESC', updatedAt: 'DESC' },
    });
    const visible = reviewable.filter((proposal) => {
      const membership = membershipByProject.get(proposal.projectId);
      const canAdminReview = membership?.role === ProjectMemberRole.Admin;
      const canReviewAssigned =
        proposal.validatorUserId === userId &&
        (membership?.role === ProjectMemberRole.Admin ||
          membership?.role === ProjectMemberRole.Modeler);
      return isOrganizationAdmin || canAdminReview || canReviewAssigned;
    });
    if (!visible.length) return [];

    const projectIds = [
      ...new Set(visible.map((proposal) => proposal.projectId)),
    ];
    const proposalIds = visible.map((proposal) => proposal.id);
    const sourceIds = [
      ...new Set(visible.map((proposal) => proposal.sourceResourceId)),
    ];
    const [projects, resources, links, events, authors] = await Promise.all([
      this.projects.find({ where: { id: In(projectIds) } }),
      this.resources.find({
        where: { id: In(sourceIds) },
      }),
      this.projectProcesses.find({
        where: { projectId: In(projectIds) },
      }),
      this.events.find({
        where: { proposalId: In(proposalIds) },
        order: { createdAt: 'DESC' },
      }),
      this.dataSource.query(
        'SELECT id, username, email FROM app_users WHERE id = ANY($1::uuid[])',
        [[...new Set(visible.map((proposal) => proposal.authorUserId))]],
      ),
    ]);
    const linked = new Set(
      links.map((link) => `${link.projectId}:${link.resourceId}`),
    );
    const projectById = new Map(
      projects.map((project) => [project.id, project]),
    );
    const resourceById = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    const authorById = new Map(
      (
        authors as Array<{
          id: string;
          username: string;
          email: string | null;
        }>
      ).map((author) => [
        author.id,
        author.username || author.email || author.id,
      ]),
    );
    const latestEventByProposal = new Map<
      string,
      ProcessChangeProposalEventTypeOrmEntity
    >();
    for (const event of events) {
      if (!latestEventByProposal.has(event.proposalId)) {
        latestEventByProposal.set(event.proposalId, event);
      }
    }

    return visible
      .filter((proposal) =>
        linked.has(`${proposal.projectId}:${proposal.sourceResourceId}`),
      )
      .map((proposal) => {
        const latestEvent = latestEventByProposal.get(proposal.id);
        return {
          id: proposal.id,
          projectId: proposal.projectId,
          projectName:
            projectById.get(proposal.projectId)?.name ?? 'Projet indisponible',
          sourceResourceId: proposal.sourceResourceId,
          sourcePublishedContentId: proposal.sourcePublishedContentId,
          processName:
            resourceById.get(proposal.sourceResourceId)?.name ??
            'Processus indisponible',
          cloneResourceId: proposal.cloneResourceId,
          submittedContentId: proposal.submittedContentId,
          authorUserId: proposal.authorUserId,
          authorName:
            authorById.get(proposal.authorUserId) ?? proposal.authorUserId,
          validatorUserId: proposal.validatorUserId,
          status: proposal.status,
          submissionComment: proposal.submissionComment,
          submittedAt: proposal.submittedAt,
          latestActivityAt: latestEvent?.createdAt ?? proposal.updatedAt,
          latestActivityType: latestEvent?.eventType ?? 'submitted',
          latestActivityComment: latestEvent?.comment ?? null,
        };
      });
  }

  /**
   * Resolve the open review proposal for the currently published process version.
   * This lets every project member see remarks without creating a second workflow.
   */
  @Get(':projectId/processes/:resourceId/change-proposals/active')
  @UseAcl()
  async getActiveProposalForProcess(
    @Param('projectId') projectId: string,
    @Param('resourceId') resourceId: string,
    @Query('contentId') contentId: string | undefined,
    @Headers() headers: RequestHeaders,
  ) {
    if (!this.access.hasOrganizationAdminRole(headers)) {
      await this.access.assertProjectRole(
        projectId,
        headers,
        ProjectMemberRole.Viewer,
      );
    }
    const link = await this.projectProcesses.findOne({
      where: { projectId, resourceId },
    });
    if (!link) throw new NotFoundException('Le processus ne fait pas partie de ce projet');
    const published = await this.dataSource.getRepository(ContentTypeOrmEntity).findOne({
      where: {
        resourceId,
        status: ContentStatusEnum.Published,
        ...(contentId ? { id: contentId } : {}),
      },
      order: { version: 'DESC' },
    });
    if (!published) return null;
    const proposal = await this.proposals.findOne({
      where: {
        projectId,
        sourceResourceId: resourceId,
        sourcePublishedContentId: published.id,
        status: In([
          ProcessChangeProposalStatus.Draft,
          ProcessChangeProposalStatus.Submitted,
          ProcessChangeProposalStatus.Approved,
          ProcessChangeProposalStatus.ChangesRequested,
        ]),
      },
      order: { createdAt: 'ASC' },
    });
    return proposal
      ? {
          id: proposal.id,
          status: proposal.status,
          cloneResourceId: proposal.cloneResourceId,
        }
      : null;
  }

  /**
   * Start a proposal by cloning the currently published BPMN inside one
   * transaction. The source remains untouched and the clone is linked only
   * to the project in which the proposal was initiated.
   */
  @Post(':projectId/processes/:resourceId/change-proposals')
  @UseAcl()
  async createProposal(
    @Param('projectId') projectId: string,
    @Param('resourceId') sourceResourceId: string,
    @Body() body: { elementId?: string; comment?: string; validatorUserId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const isViewerRemark = Boolean(body?.elementId?.trim() || body?.comment?.trim());
    if (isViewerRemark && (!body.elementId?.trim() || !body.comment?.trim())) {
      throw new BadRequestException(
        'L’identifiant de l’élément BPMN et le texte de la remarque sont obligatoires',
      );
    }
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    const authorUsername = isViewerRemark
      ? this.access.getAuthenticatedUserId(headers)
      : await this.access.assertProjectRole(
          projectId,
          headers,
          ProjectMemberRole.Modeler,
        );
    if (isViewerRemark) {
      if (!isOrganizationAdmin) {
        await this.access.assertProjectRole(
          projectId,
          headers,
          ProjectMemberRole.Viewer,
        );
      }
      if (!isOrganizationAdmin) {
        await this.access.assertCanReadResource(sourceResourceId, headers);
      }
    } else {
      // Keep the existing clone policy for ordinary modeler proposals.
      await this.access.assertCanCloneResource(projectId, sourceResourceId, headers);
    }
    const authorUserId = await this.resolveAccountId(authorUsername);

    return this.dataSource.transaction(async (manager) => {
      const resources = manager.getRepository(ResourceTypeOrmEntity);
      const contents = manager.getRepository(ContentTypeOrmEntity);
      const links = manager.getRepository(ProjectProcessTypeOrmEntity);
      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      const proposals = manager.getRepository(
        ProcessChangeProposalTypeOrmEntity,
      );
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );
      const authorMembership = await members.findOne({
        where: { projectId, userId: authorUsername },
      });
      if (
        !isOrganizationAdmin &&
        (!authorMembership ||
          (isViewerRemark
            ? ![
                ProjectMemberRole.Viewer,
                ProjectMemberRole.Modeler,
                ProjectMemberRole.Admin,
              ].includes(authorMembership.role)
            : authorMembership.role !== ProjectMemberRole.Modeler &&
              authorMembership.role !== ProjectMemberRole.Admin))
      ) {
        throw new ForbiddenException(
          isViewerRemark
            ? 'L’accès au projet est requis pour déposer une remarque'
            : 'Le rôle de modélisateur est requis pour proposer une modification',
        );
      }

      const sourceLink = await links.findOne({
        where: { projectId, resourceId: sourceResourceId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!sourceLink) {
        throw new NotFoundException(
          'Le processus ne fait pas partie de ce projet',
        );
      }

      const source = await resources.findOne({
        where: { id: sourceResourceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source || source.type !== ResourceTypeEnum.Process) {
        throw new NotFoundException('Processus source introuvable');
      }

      const published = await contents.findOne({
        where: {
          resourceId: sourceResourceId,
          status: ContentStatusEnum.Published,
        },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_read' },
      });
      if (!published) {
        throw new BadRequestException(
          'Aucune version publiée du processus ne peut être proposée',
        );
      }

      const existingOpenProposal = await proposals.findOne({
        where: {
          projectId,
          sourceResourceId,
          sourcePublishedContentId: published.id,
          status: In([
            ProcessChangeProposalStatus.Draft,
            ProcessChangeProposalStatus.Submitted,
            ProcessChangeProposalStatus.Approved,
            ProcessChangeProposalStatus.ChangesRequested,
          ]),
        },
        order: { createdAt: 'ASC' },
      });
      if (existingOpenProposal) {
        if (!isViewerRemark) {
          throw new ConflictException(
            'Une demande de modification est déjà ouverte pour cette version du processus',
          );
        }
        const cloneDraft = await contents.findOne({
          where: {
            resourceId: existingOpenProposal.cloneResourceId,
            status: ContentStatusEnum.Draft,
          },
          order: { version: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        });
        if (!cloneDraft) {
          throw new ConflictException(
            'Le brouillon associé à la demande ouverte est indisponible',
          );
        }
        let validatorUserId = existingOpenProposal.validatorUserId;
        if (!validatorUserId && body.validatorUserId?.trim()) {
          const candidates: Array<{ id: string; username: string }> = await manager.query(
            'SELECT id, username FROM app_users WHERE (lower(username) = lower($1) OR lower(email) = lower($1) OR id::text = $1) AND active = TRUE LIMIT 1',
            [body.validatorUserId.trim()],
          );
          const candidate = candidates[0];
          if (candidate && candidate.id !== authorUserId) {
            const candidateMembership = await members.findOne({
              where: { projectId, userId: candidate.username },
            });
            if (
              candidateMembership &&
              (candidateMembership.role === ProjectMemberRole.Admin ||
                candidateMembership.role === ProjectMemberRole.Modeler)
            ) validatorUserId = candidate.id;
          }
        }
        if (!validatorUserId) {
          const admins = await members.find({
            where: { projectId, role: ProjectMemberRole.Admin },
            order: { createdAt: 'ASC' },
          });
          for (const admin of admins) {
            if (admin.userId === authorUsername) continue;
            const adminRows: Array<{ id: string }> = await manager.query(
              'SELECT id FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
              [admin.userId],
            );
            if (adminRows[0]) {
              validatorUserId = adminRows[0].id;
              break;
            }
          }
        }
        const shouldSubmit =
          existingOpenProposal.status !== ProcessChangeProposalStatus.Submitted;
        if (shouldSubmit) {
          existingOpenProposal.status = ProcessChangeProposalStatus.Submitted;
          existingOpenProposal.submittedContentId = cloneDraft.id;
          existingOpenProposal.submittedAt = new Date();
          existingOpenProposal.decidedAt = null;
          existingOpenProposal.submissionComment =
            existingOpenProposal.submissionComment ||
            'Remarques déposées depuis le Viewer';
        }
        if (
          existingOpenProposal.validatorUserId !== validatorUserId ||
          shouldSubmit
        ) {
          existingOpenProposal.validatorUserId = validatorUserId;
          await proposals.save(existingOpenProposal);
        }
        if (shouldSubmit) {
          await events.save(events.create({
            proposalId: existingOpenProposal.id,
            eventType: 'submitted',
            actorUserId: authorUserId,
            validatorUserId,
            comment: 'Remarques déposées depuis le Viewer',
            details: { submittedContentId: cloneDraft.id, source: 'viewer-remark' },
            createdBy: authorUsername,
          }));
        }
        const savedRemark = await manager.getRepository(
          ProcessChangeProposalCommentTypeOrmEntity,
        ).save(manager.getRepository(
          ProcessChangeProposalCommentTypeOrmEntity,
        ).create({
          proposalId: existingOpenProposal.id,
          elementId: body.elementId!.trim(),
          authorUserId,
          comment: body.comment!.trim(),
          status: ProcessChangeProposalCommentStatus.Pending,
          decisionBy: null,
          decidedAt: null,
          decisionComment: null,
          createdBy: authorUsername,
        }));
        return {
          id: existingOpenProposal.id,
          projectId,
          sourceResourceId,
          cloneResourceId: existingOpenProposal.cloneResourceId,
          cloneContentId: cloneDraft.id,
          status: existingOpenProposal.status,
          comment: savedRemark,
          reused: true,
        };
      }

      const cloneResource = resources.create({
        name: `${source.name.slice(0, 220)} — proposition ${randomUUID().slice(0, 8)}`,
        description: source.description,
        depth: source.depth,
        parentId: source.parentId,
        sourceResourceId: source.id,
        type: ResourceTypeEnum.Process,
        authToken: null,
        createdBy: authorUsername,
      });
      const savedClone = await resources.save(cloneResource);

      const cloneContent = contents.create({
        resourceId: savedClone.id,
        status: ContentStatusEnum.Draft,
        version: 1,
        content: published.content,
        changeComment: null,
        pngContent: null,
        updatedBy: authorUsername,
        createdBy: authorUsername,
      });
      const savedCloneContent = await contents.save(cloneContent);

      await links.save(
        links.create({
          projectId,
          resourceId: savedClone.id,
          usage: ProjectProcessUsage.ProjectSpecific,
          sourceResourceId,
          createdBy: authorUsername,
        }),
      );

      let initialValidatorUserId: string | null = null;
      if (isViewerRemark) {
        const validatorIdentifier = body.validatorUserId?.trim();
        if (validatorIdentifier) {
          const validatorRows: Array<{ id: string; username: string }> = await manager.query(
            'SELECT id, username FROM app_users WHERE (lower(username) = lower($1) OR lower(email) = lower($1) OR id::text = $1) AND active = TRUE LIMIT 1',
            [validatorIdentifier],
          );
          const candidate = validatorRows[0];
          if (candidate && candidate.id !== authorUserId) {
            const candidateMembership = await members.findOne({
              where: { projectId, userId: candidate.username },
            });
            if (
              candidateMembership &&
              (candidateMembership.role === ProjectMemberRole.Admin ||
                candidateMembership.role === ProjectMemberRole.Modeler)
            ) initialValidatorUserId = candidate.id;
          }
        }
        if (!initialValidatorUserId) {
          const admins = await members.find({
            where: { projectId, role: ProjectMemberRole.Admin },
            order: { createdAt: 'ASC' },
          });
          for (const admin of admins) {
            if (admin.userId === authorUsername) continue;
            const adminRows: Array<{ id: string }> = await manager.query(
              'SELECT id FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
              [admin.userId],
            );
            if (adminRows[0]) {
              initialValidatorUserId = adminRows[0].id;
              break;
            }
          }
        }
      }

      const proposal = await proposals.save(
        proposals.create({
          projectId,
          sourceResourceId,
          cloneResourceId: savedClone.id,
          sourcePublishedContentId: published.id,
          submittedContentId: isViewerRemark ? savedCloneContent.id : null,
          authorUserId,
          validatorUserId: initialValidatorUserId,
          status: isViewerRemark
            ? ProcessChangeProposalStatus.Submitted
            : ProcessChangeProposalStatus.Draft,
          submissionComment: isViewerRemark
            ? 'Remarques déposées depuis le Viewer'
            : null,
          submittedAt: isViewerRemark ? new Date() : null,
          decidedAt: null,
          createdBy: authorUsername,
        }),
      );

      await events.save(
        events.create({
          proposalId: proposal.id,
          eventType: 'created',
          actorUserId: authorUserId,
          validatorUserId: initialValidatorUserId,
          comment: null,
          details: {
            sourcePublishedContentId: published.id,
            cloneResourceId: savedClone.id,
            cloneContentId: savedCloneContent.id,
          },
          createdBy: authorUsername,
        }),
      );

      let initialRemark: ProcessChangeProposalCommentTypeOrmEntity | null = null;
      if (isViewerRemark) {
        const comments = manager.getRepository(ProcessChangeProposalCommentTypeOrmEntity);
        initialRemark = await comments.save(comments.create({
          proposalId: proposal.id,
          elementId: body.elementId!.trim(),
          authorUserId,
          comment: body.comment!.trim(),
          status: ProcessChangeProposalCommentStatus.Pending,
          decisionBy: null,
          decidedAt: null,
          decisionComment: null,
          createdBy: authorUsername,
        }));
        await events.save(events.create({
          proposalId: proposal.id,
          eventType: 'submitted',
          actorUserId: authorUserId,
          validatorUserId: initialValidatorUserId,
          comment: 'Remarques déposées depuis le Viewer',
          details: { submittedContentId: savedCloneContent.id, source: 'viewer-remark' },
          createdBy: authorUsername,
        }));
      }

      return {
        id: proposal.id,
        projectId,
        sourceResourceId,
        cloneResourceId: savedClone.id,
        cloneContentId: savedCloneContent.id,
        status: proposal.status,
        comment: initialRemark,
        reused: false,
      };
    });
  }

  /**
   * Submit a frozen draft snapshot for review. Proposal workflow state is
   * stored only on the proposal row; the BPMN content remains a draft.
   */
  @Post('process-change-proposals/:proposalId/submit')
  @UseAcl()
  async submitProposal(
    @Param('proposalId') proposalId: string,
    @Body() body: { comment?: string; validatorUserId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const existing = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!existing) throw new NotFoundException('Demande introuvable');

    const actorUsername = await this.access.assertProjectRole(
      existing.projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const actorUserId = await this.resolveAccountId(actorUsername);
    const comment = body.comment?.trim() ?? '';
    if (!comment) {
      throw new BadRequestException(
        'Un commentaire de soumission est obligatoire',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const proposals = manager.getRepository(
        ProcessChangeProposalTypeOrmEntity,
      );
      const contents = manager.getRepository(ContentTypeOrmEntity);
      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );
      const resources = manager.getRepository(ResourceTypeOrmEntity);
      const authorMembership = await members.findOne({
        where: { projectId: existing.projectId, userId: actorUsername },
      });
      if (
        !authorMembership ||
        (authorMembership.role !== ProjectMemberRole.Modeler &&
          authorMembership.role !== ProjectMemberRole.Admin)
      ) {
        throw new ForbiddenException(
          'Le rôle de modélisateur est requis pour soumettre cette demande',
        );
      }

      const proposal = await proposals.findOne({
        where: { id: proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!proposal) throw new NotFoundException('Demande introuvable');
      if (proposal.authorUserId !== actorUserId) {
        throw new ForbiddenException(
          'Seul l’auteur peut soumettre cette demande',
        );
      }
      if (
        proposal.status !== ProcessChangeProposalStatus.Draft &&
        proposal.status !== ProcessChangeProposalStatus.ChangesRequested
      ) {
        throw new ConflictException(
          'La demande ne peut pas être soumise dans son état actuel',
        );
      }

      const source = await resources.findOne({
        where: { id: proposal.sourceResourceId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!source) {
        throw new NotFoundException('Processus source introuvable');
      }

      const currentPublished = await contents.findOne({
        where: {
          resourceId: proposal.sourceResourceId,
          status: ContentStatusEnum.Published,
        },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_read' },
      });
      if (
        !currentPublished ||
        currentPublished.id !== proposal.sourcePublishedContentId
      ) {
        throw new ConflictException(
          'Le processus source a changé depuis la création de la demande. Créez une nouvelle proposition.',
        );
      }

      const submittedContent = await contents.findOne({
        where: {
          resourceId: proposal.cloneResourceId,
          status: ContentStatusEnum.Draft,
        },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!submittedContent) {
        throw new BadRequestException(
          'Le brouillon de travail est introuvable ou n’est plus modifiable',
        );
      }

      let validatorUserId: string | null = null;
      let validatorResolution:
        | 'pilot_assigned'
        | 'pilot_missing'
        | 'pilot_invalid' = body.validatorUserId?.trim()
        ? 'pilot_invalid'
        : 'pilot_missing';
      const pilotIdentifier =
        body.validatorUserId?.trim() || proposal.validatorUserId || null;
      let pilotRows: Array<{ id: string; username: string }> = [];
      if (pilotIdentifier) {
        pilotRows = await manager.query(
          'SELECT id, username FROM app_users WHERE (lower(username) = lower($1) OR lower(email) = lower($1) OR id::text = $1) AND active = TRUE LIMIT 1',
          [pilotIdentifier],
        );
      }
      const pilot = pilotRows[0];
      if (pilot && pilot.id !== actorUserId) {
        const pilotMembership = await members.findOne({
          where: { projectId: proposal.projectId, userId: pilot.username },
        });
        if (
          pilotMembership &&
          (pilotMembership.role === ProjectMemberRole.Admin ||
            pilotMembership.role === ProjectMemberRole.Modeler)
        ) {
          validatorUserId = pilot.id;
          validatorResolution = 'pilot_assigned';
        }
      }

      if (!validatorUserId) {
        const admins = await members.find({
          where: {
            projectId: proposal.projectId,
            role: ProjectMemberRole.Admin,
          },
          order: { createdAt: 'ASC' },
        });
        for (const admin of admins) {
          if (admin.userId === actorUsername) continue;
          const adminRows: Array<{ id: string }> = await manager.query(
            'SELECT id FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
            [admin.userId],
          );
          if (adminRows[0]) {
            validatorUserId = adminRows[0].id;
            break;
          }
        }
      }

      proposal.validatorUserId = validatorUserId;
      proposal.submittedContentId = submittedContent.id;
      proposal.submissionComment = comment;
      proposal.submittedAt = new Date();
      proposal.decidedAt = null;
      proposal.status = ProcessChangeProposalStatus.Submitted;
      const savedProposal = await proposals.save(proposal);

      await events.save(
        events.create({
          proposalId,
          eventType: 'submitted',
          actorUserId,
          validatorUserId,
          comment,
          details: {
            submittedContentId: submittedContent.id,
            validatorResolution,
            validatorWarning:
              validatorResolution === 'pilot_assigned'
                ? null
                : 'Le pilote du processus est absent ou non reconnu ; une validation administrateur est à prévoir.',
          },
          createdBy: actorUsername,
        }),
      );

      return {
        id: savedProposal.id,
        status: savedProposal.status,
        validatorUserId,
        validatorWarning:
          validatorResolution === 'pilot_assigned'
            ? null
            : 'Le pilote du processus est absent ou non reconnu ; une validation administrateur est à prévoir.',
        submittedContentId: submittedContent.id,
        submittedAt: savedProposal.submittedAt,
      };
    });
  }
  /**
   * Record the validator's decision without changing the BPMN content status.
   * Project administrators may act as a fallback when the assigned validator
   * is unavailable.
   */
  @Post('process-change-proposals/:proposalId/decision')
  @UseAcl()
  async decideProposal(
    @Param('proposalId') proposalId: string,
    @Body()
    body: {
      decision?: ProcessChangeProposalStatus;
      comment?: string;
    },
    @Headers() headers: RequestHeaders,
  ) {
    const existing = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!existing) throw new NotFoundException('Demande introuvable');

    const actorUsername = this.access.getAuthenticatedUserId(headers);
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    if (!isOrganizationAdmin) {
      await this.access.assertProjectRole(
        existing.projectId,
        headers,
        ProjectMemberRole.Modeler,
      );
    }
    const actorUserId = await this.resolveAccountId(actorUsername);
    const decision = body.decision;
    if (
      decision !== ProcessChangeProposalStatus.Approved &&
      decision !== ProcessChangeProposalStatus.ChangesRequested &&
      decision !== ProcessChangeProposalStatus.Rejected
    ) {
      throw new BadRequestException('Décision de validation non reconnue');
    }
    const comment = body.comment?.trim() ?? '';
    if (
      (decision === ProcessChangeProposalStatus.ChangesRequested ||
        decision === ProcessChangeProposalStatus.Rejected) &&
      !comment
    ) {
      throw new BadRequestException(
        'Un commentaire est obligatoire pour demander des modifications ou rejeter la demande',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const proposals = manager.getRepository(
        ProcessChangeProposalTypeOrmEntity,
      );
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );
      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      const proposal = await proposals.findOne({
        where: { id: proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!proposal) throw new NotFoundException('Demande introuvable');
      if (proposal.status !== ProcessChangeProposalStatus.Submitted) {
        throw new ConflictException(
          'Seule une demande soumise peut faire l’objet d’une décision',
        );
      }
      if (decision === ProcessChangeProposalStatus.Approved) {
        const pendingRemarks = await manager
          .getRepository(ProcessChangeProposalCommentTypeOrmEntity)
          .count({
            where: {
              proposalId,
              status: ProcessChangeProposalCommentStatus.Pending,
            },
          });
        if (pendingRemarks > 0) {
          throw new ConflictException(
            `L’approbation est bloquée : ${pendingRemarks} remarque(s) restent à traiter`,
          );
        }
      }
      const currentMembership = await members.findOne({
        where: { projectId: proposal.projectId, userId: actorUsername },
      });
      if (
        !isOrganizationAdmin &&
        (!currentMembership ||
          (currentMembership.role !== ProjectMemberRole.Admin &&
            currentMembership.role !== ProjectMemberRole.Modeler))
      ) {
        throw new ForbiddenException(
          'Votre rôle dans le projet ne permet plus cette action',
        );
      }
      if (
        proposal.validatorUserId !== actorUserId &&
        currentMembership?.role !== ProjectMemberRole.Admin &&
        !isOrganizationAdmin
      ) {
        throw new ForbiddenException(
          'Seul le validateur désigné ou un administrateur du projet peut décider',
        );
      }

      proposal.status = decision;
      proposal.decidedAt = new Date();
      const saved = await proposals.save(proposal);
      await events.save(
        events.create({
          proposalId,
          eventType: decision,
          actorUserId,
          validatorUserId: proposal.validatorUserId,
          comment: comment || null,
          details: null,
          createdBy: actorUsername,
        }),
      );
      return {
        id: saved.id,
        status: saved.status,
        decidedAt: saved.decidedAt,
      };
    });
  }

  /**
   * Promote the reviewed BPMN snapshot to the source process. Source version
   * verification, previous-version obsolescence, new publication and proposal
   * history are committed in one database transaction.
   */
  @Post('process-change-proposals/:proposalId/publish')
  @UseAcl()
  async publishApprovedProposal(
    @Param('proposalId') proposalId: string,
    @Body() body: { pngContent?: string; summaryComment?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const existing = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!existing) throw new NotFoundException('Demande introuvable');

    const actorUsername = this.access.getAuthenticatedUserId(headers);
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    if (!isOrganizationAdmin) {
      await this.access.assertProjectRole(
        existing.projectId,
        headers,
        ProjectMemberRole.Modeler,
      );
    }
    const actorUserId = await this.resolveAccountId(actorUsername);
    const pngContent = body.pngContent?.trim();
    if (!pngContent) {
      throw new BadRequestException(
        'La prévisualisation PNG du processus est obligatoire pour publier',
      );
    }
    const summaryComment = body.summaryComment?.trim() ?? '';
    if (!summaryComment) {
      throw new BadRequestException(
        'Un commentaire général de validation est obligatoire pour publier',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const proposals = manager.getRepository(
        ProcessChangeProposalTypeOrmEntity,
      );
      const resources = manager.getRepository(ResourceTypeOrmEntity);
      const contents = manager.getRepository(ContentTypeOrmEntity);
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );
      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      const proposalComments = manager.getRepository(ProcessChangeProposalCommentTypeOrmEntity);

      const proposal = await proposals.findOne({
        where: { id: proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!proposal) throw new NotFoundException('Demande introuvable');
      if (proposal.status !== ProcessChangeProposalStatus.Approved) {
        throw new ConflictException(
          'La demande doit être approuvée avant publication',
        );
      }
      const currentMembership = await members.findOne({
        where: { projectId: proposal.projectId, userId: actorUsername },
      });
      if (
        proposal.validatorUserId !== actorUserId &&
        currentMembership?.role !== ProjectMemberRole.Admin &&
        !isOrganizationAdmin
      ) {
        throw new ForbiddenException(
          'Seul le validateur désigné ou un administrateur du projet peut publier',
        );
      }
      const remarks = await proposalComments.find({
        where: { proposalId },
        order: { createdAt: 'ASC' },
      });
      const pendingRemarks = remarks.filter(
        remark => remark.status === ProcessChangeProposalCommentStatus.Pending,
      );
      if (pendingRemarks.length) {
        throw new ConflictException(
          `La publication est bloquée : ${pendingRemarks.length} remarque(s) restent à traiter`,
        );
      }
      if (!proposal.submittedContentId) {
        throw new ConflictException(
          'La demande ne contient aucune version soumise à validation',
        );
      }

      const source = await resources.findOne({
        where: { id: proposal.sourceResourceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source) throw new NotFoundException('Processus source introuvable');

      const submittedContent = await contents.findOne({
        where: {
          id: proposal.submittedContentId,
          resourceId: proposal.cloneResourceId,
          status: ContentStatusEnum.Draft,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!submittedContent) {
        throw new ConflictException(
          'La version soumise n’est plus disponible comme brouillon',
        );
      }

      const currentPublished = await contents.findOne({
        where: {
          resourceId: proposal.sourceResourceId,
          status: ContentStatusEnum.Published,
        },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !currentPublished ||
        currentPublished.id !== proposal.sourcePublishedContentId
      ) {
        throw new ConflictException(
          'Le processus source a changé depuis la soumission. La publication est bloquée.',
        );
      }

      const latestVersion = await contents
        .createQueryBuilder('content')
        .setLock('pessimistic_write')
        .where('content."resourceId" = :resourceId', {
          resourceId: proposal.sourceResourceId,
        })
        .andWhere('content.status IN (:...statuses)', {
          statuses: [ContentStatusEnum.Published, ContentStatusEnum.Obsolete],
        })
        .orderBy('content.version', 'DESC', 'NULLS LAST')
        .getOne();

      currentPublished.status = ContentStatusEnum.Obsolete;
      currentPublished.updatedBy = actorUsername;
      currentPublished.pngContent = null;
      await contents.save(currentPublished);

      const newPublished = await contents.save(
        contents.create({
          resourceId: proposal.sourceResourceId,
          status: ContentStatusEnum.Published,
          version: Math.max(
            (latestVersion?.version ?? 0) + 1,
            submittedContent.version ?? 1,
          ),
          content: submittedContent.content,
          changeComment: [
            summaryComment,
            'Synthèse des remarques contextuelles :',
            ...remarks.map(remark =>
              `- [${remark.status}] ${remark.createdAt.toISOString()} · auteur ${remark.authorUserId} · élément ${remark.elementId} · ${remark.comment}${remark.decidedAt ? ` · décidé le ${remark.decidedAt.toISOString()} par ${remark.decisionBy}` : ''}${remark.decisionComment ? ` · décision : ${remark.decisionComment}` : ''}`,
            ),
          ].join('\n'),
          pngContent: Buffer.from(
            pngContent.replace(/^data:image\/png;base64,/, ''),
            'base64',
          ),
          updatedBy: actorUsername,
          createdBy: actorUsername,
        }),
      );

      if (!source.authToken) {
        source.authToken = randomBytes(32).toString('hex');
        await resources.save(source);
      }

      proposal.status = ProcessChangeProposalStatus.Published;
      proposal.decidedAt = new Date();
      await proposals.save(proposal);
      await events.save(
        events.create({
          proposalId,
          eventType: 'published',
          actorUserId,
          validatorUserId: proposal.validatorUserId,
          comment: null,
          details: {
            sourcePublishedContentId: newPublished.id,
            version: newPublished.version,
          },
          createdBy: actorUsername,
        }),
      );

      return {
        id: proposal.id,
        status: proposal.status,
        publishedContentId: newPublished.id,
        version: newPublished.version,
      };
    });
  }
  /**
   * Contextual BPMN remarks are stored outside the BPMN XML. Project viewers
   * can read them; the proposal workflow remains the single source of truth.
   */
  @Get('process-change-proposals/:proposalId/comments')
  @UseAcl()
  async listProposalComments(
    @Param('proposalId') proposalId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const proposal = await this.proposals.findOne({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    if (!this.access.hasOrganizationAdminRole(headers)) {
      await this.access.assertProjectRole(
        proposal.projectId,
        headers,
        ProjectMemberRole.Viewer,
      );
    }
    const comments = await this.proposalComments.find({
      where: { proposalId },
      order: { createdAt: 'ASC' },
    });
    if (!comments.length) return [];
    const userIds = [...new Set(
      comments.flatMap(comment => [
        comment.authorUserId,
        ...(comment.decisionBy ? [comment.decisionBy] : []),
      ]),
    )];
    const users: Array<{ id: string; username: string; email: string | null }> =
      await this.dataSource.query(
        'SELECT id, username, email FROM app_users WHERE id = ANY($1::uuid[])',
        [userIds],
      );
    const userNameById = new Map(users.map(user => [
      user.id,
      user.username || user.email || user.id,
    ]));
    return comments.map(comment => ({
      ...comment,
      authorName: userNameById.get(comment.authorUserId) ?? comment.authorUserId,
      decisionByName: comment.decisionBy
        ? userNameById.get(comment.decisionBy) ?? comment.decisionBy
        : null,
    }));
  }

  /**
   * Add one independent remark to an existing proposal. New remarks reopen
   * the review queue by preventing publication until each remark is decided.
   */
  @Post('process-change-proposals/:proposalId/comments')
  @UseAcl()
  async addProposalComment(
    @Param('proposalId') proposalId: string,
    @Body() body: { elementId?: string; comment?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const proposal = await this.proposals.findOne({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    if (!this.access.hasOrganizationAdminRole(headers)) {
      await this.access.assertProjectRole(
        proposal.projectId,
        headers,
        ProjectMemberRole.Viewer,
      );
    }
    if (
      proposal.status === ProcessChangeProposalStatus.Rejected ||
      proposal.status === ProcessChangeProposalStatus.Published
    ) {
      throw new ConflictException(
        'Impossible d’ajouter une remarque à une demande clôturée',
      );
    }
    const elementId = body.elementId?.trim() ?? '';
    const comment = body.comment?.trim() ?? '';
    if (!elementId || !comment) {
      throw new BadRequestException(
        'L’élément BPMN et le texte de la remarque sont obligatoires',
      );
    }
    if (elementId.length > 255) {
      throw new BadRequestException('Identifiant BPMN trop long');
    }
    const actorUsername = this.access.getAuthenticatedUserId(headers);
    const authorUserId = await this.resolveAccountId(actorUsername);
    return this.dataSource.transaction(async (manager) => {
      const proposals = manager.getRepository(ProcessChangeProposalTypeOrmEntity);
      const comments = manager.getRepository(ProcessChangeProposalCommentTypeOrmEntity);
      const events = manager.getRepository(ProcessChangeProposalEventTypeOrmEntity);
      const lockedProposal = await proposals.findOne({
        where: { id: proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedProposal) throw new NotFoundException('Demande introuvable');
      if (
        lockedProposal.status === ProcessChangeProposalStatus.Rejected ||
        lockedProposal.status === ProcessChangeProposalStatus.Published
      ) {
        throw new ConflictException('La demande est clôturée');
      }
      if (lockedProposal.status === ProcessChangeProposalStatus.Approved) {
        lockedProposal.status = ProcessChangeProposalStatus.Submitted;
        lockedProposal.decidedAt = null;
        lockedProposal.submittedAt = new Date();
        await proposals.save(lockedProposal);
        await events.save(events.create({
          proposalId,
          eventType: 'submitted',
          actorUserId: authorUserId,
          validatorUserId: lockedProposal.validatorUserId,
          comment: 'Nouvelle remarque ajoutée après approbation',
          details: { reopenedByRemark: true },
          createdBy: actorUsername,
        }));
      }
      return comments.save(comments.create({
        proposalId,
        elementId,
        authorUserId,
        comment,
        status: ProcessChangeProposalCommentStatus.Pending,
        decisionBy: null,
        decidedAt: null,
        decisionComment: null,
        createdBy: actorUsername,
      }));
    });
  }

  /**
   * The assigned validator, a project administrator, or an organization
   * administrator may decide an individual remark. Decisions are one-way.
   */
  @Post('process-change-proposals/:proposalId/comments/:commentId/decision')
  @UseAcl()
  async decideProposalComment(
    @Param('proposalId') proposalId: string,
    @Param('commentId') commentId: string,
    @Body() body: { decision?: 'accepted' | 'rejected'; comment?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const proposal = await this.proposals.findOne({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    if (
      proposal.status === ProcessChangeProposalStatus.Rejected ||
      proposal.status === ProcessChangeProposalStatus.Published
    ) {
      throw new ConflictException('La demande est clôturée');
    }
    const actorUsername = this.access.getAuthenticatedUserId(headers);
    const actorUserId = await this.resolveAccountId(actorUsername);
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    const membership = await this.members.findOne({
      where: { projectId: proposal.projectId, userId: actorUsername },
    });
    const canReviewAsProjectAdmin = membership?.role === ProjectMemberRole.Admin;
    const canReviewAsAssignedValidator =
      proposal.validatorUserId === actorUserId &&
      (membership?.role === ProjectMemberRole.Admin ||
        membership?.role === ProjectMemberRole.Modeler);
    if (
      !isOrganizationAdmin &&
      !canReviewAsProjectAdmin &&
      !canReviewAsAssignedValidator
    ) {
      throw new ForbiddenException(
        'Seul le validateur désigné, le gestionnaire du projet ou un administrateur global peut traiter cette remarque',
      );
    }
    if (body.decision !== 'accepted' && body.decision !== 'rejected') {
      throw new BadRequestException('Décision de remarque non reconnue');
    }
    const decisionComment = body.comment?.trim() ?? '';
    return this.dataSource.transaction(async (manager) => {
      const comments = manager.getRepository(ProcessChangeProposalCommentTypeOrmEntity);
      const current = await comments.findOne({
        where: { id: commentId, proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) throw new NotFoundException('Remarque introuvable');
      if (current.status !== ProcessChangeProposalCommentStatus.Pending) {
        throw new ConflictException(
          'Cette remarque a déjà fait l’objet d’une décision',
        );
      }
      current.status = body.decision === 'accepted'
        ? ProcessChangeProposalCommentStatus.Accepted
        : ProcessChangeProposalCommentStatus.Rejected;
      current.decisionBy = actorUserId;
      current.decidedAt = new Date();
      current.decisionComment = decisionComment || null;
      return comments.save(current);
    });
  }

  private async resolveAccountId(username: string): Promise<string> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      'SELECT id FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
      [username],
    );
    if (!rows[0]?.id) {
      throw new ForbiddenException(
        'Le compte utilisateur associé à la session est introuvable ou désactivé',
      );
    }
    return rows[0].id;
  }
}
