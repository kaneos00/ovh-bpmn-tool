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
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ResourceTypeEnum } from '../../../ResourceContext/shared/types/Resource';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';
import {
  createProposalWorkspace,
  publishProposalWorkspace,
} from '../services/process-change-proposal-content.service';
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
   * Ensure that the process is used in the selected project.
   * The contribution workflow may collect remarks on common processes too;
   * cloning or changing their project classification remains forbidden.
   */
  private async assertProjectWorkflowScope(
    projectId: string,
    resourceId: string,
  ): Promise<void> {
    const link = await this.projectProcesses.findOne({
      where: { projectId, resourceId },
    });
    if (!link) {
      throw new NotFoundException(
        'Le processus ne fait pas partie de ce projet',
      );
    }
  }

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

    const cloneDrafts = await this.dataSource
      .getRepository(ContentTypeOrmEntity)
      .find({
        where: {
          resourceId: In(visible.map((proposal) => proposal.cloneResourceId)),
          status: ContentStatusEnum.Draft,
        },
        order: { version: 'DESC', updatedAt: 'DESC' },
      });
    const cloneDraftByResourceId = new Map<string, ContentTypeOrmEntity>();
    for (const draft of cloneDrafts) {
      if (!cloneDraftByResourceId.has(draft.resourceId)) {
        cloneDraftByResourceId.set(draft.resourceId, draft);
      }
    }

    const events = await this.events.find({
      where: { proposalId: In(visible.map((proposal) => proposal.id)) },
      order: { createdAt: 'DESC' },
    });
    const remarks = await this.proposalComments.find({
      where: { proposalId: In(visible.map((proposal) => proposal.id)) },
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
    const remarkCountsByProposal = new Map<
      string,
      { total: number; pending: number }
    >();
    for (const remark of remarks) {
      const counts = remarkCountsByProposal.get(remark.proposalId) ?? {
        total: 0,
        pending: 0,
      };
      counts.total += 1;
      if (remark.status === ProcessChangeProposalCommentStatus.Pending) {
        counts.pending += 1;
      }
      remarkCountsByProposal.set(remark.proposalId, counts);
    }
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
        cloneContentId:
          cloneDraftByResourceId.get(proposal.cloneResourceId)?.id ?? null,
        submittedContentId: proposal.submittedContentId,
        authorUserId: proposal.authorUserId,
        validatorUserId: proposal.validatorUserId,
        validatorName: proposal.validatorUserId
          ? (validatorById.get(proposal.validatorUserId) ?? null)
          : null,
        status: proposal.status,
        submissionComment: proposal.submissionComment,
        totalRemarksCount: remarkCountsByProposal.get(proposal.id)?.total ?? 0,
        pendingRemarksCount:
          remarkCountsByProposal.get(proposal.id)?.pending ?? 0,
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
    const [projects, resources, links, events, authors, remarks] =
      await Promise.all([
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
        this.proposalComments.find({
          where: { proposalId: In(proposalIds) },
        }),
      ]);
    const linkByKey = new Map(
      links.map((link) => [`${link.projectId}:${link.resourceId}`, link]),
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
    const remarkCountsByProposal = new Map<
      string,
      { total: number; pending: number }
    >();
    for (const remark of remarks) {
      const counts = remarkCountsByProposal.get(remark.proposalId) ?? {
        total: 0,
        pending: 0,
      };
      counts.total += 1;
      if (remark.status === ProcessChangeProposalCommentStatus.Pending) {
        counts.pending += 1;
      }
      remarkCountsByProposal.set(remark.proposalId, counts);
    }
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
      .filter((proposal) => {
        const link = linkByKey.get(
          `${proposal.projectId}:${proposal.sourceResourceId}`,
        );
        return Boolean(
          link &&
          (link.usage !== ProjectProcessUsage.Common || isOrganizationAdmin),
        );
      })
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
          totalRemarksCount:
            remarkCountsByProposal.get(proposal.id)?.total ?? 0,
          pendingRemarksCount:
            remarkCountsByProposal.get(proposal.id)?.pending ?? 0,
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
    if (!link)
      throw new NotFoundException(
        'Le processus ne fait pas partie de ce projet',
      );
    const published = await this.dataSource
      .getRepository(ContentTypeOrmEntity)
      .findOne({
        where: {
          resourceId,
          status: ContentStatusEnum.Published,
          ...(contentId ? { id: contentId } : {}),
        },
        order: { version: 'DESC' },
      });
    if (!published) return null;
    const activeProposals = await this.proposals.find({
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
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!activeProposals.length) return null;

    const contents = this.dataSource.getRepository(ContentTypeOrmEntity);
    // A proposal is resumable only when its own workspace still contains a
    // draft. Skip orphaned historical rows instead of letting the oldest
    // missing workspace mask a newer, usable request for the same version.
    for (const proposal of activeProposals) {
      const cloneDraft = await contents.findOne({
        where: {
          resourceId: proposal.cloneResourceId,
          status: ContentStatusEnum.Draft,
        },
        order: { version: 'DESC', updatedAt: 'DESC' },
      });
      if (cloneDraft) {
        return {
          id: proposal.id,
          status: proposal.status,
          cloneResourceId: proposal.cloneResourceId,
          cloneContentId: cloneDraft.id,
        };
      }
    }

    // An active row without a draft is not resumable. Return no active
    // workspace so the UI offers a fresh request; createProposal will close
    // the orphaned row with an audit event before creating the replacement.
    return null;
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
    @Body()
    body: { elementId?: string; comment?: string; validatorUserId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const isViewerRemark = Boolean(
      body?.elementId?.trim() || body?.comment?.trim(),
    );
    if (isViewerRemark && (!body.elementId?.trim() || !body.comment?.trim())) {
      throw new BadRequestException(
        'L’identifiant de l’élément BPMN et le texte de la remarque sont obligatoires',
      );
    }
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    const authorUsername = isViewerRemark
      ? await this.assertCanSubmitRemarks(projectId, headers)
      : await this.access.assertProjectRole(
          projectId,
          headers,
          ProjectMemberRole.Modeler,
        );
    // The project role above is the authorization boundary for this
    // workflow. A proposal creates a private workspace and never mutates the
    // source, so requiring clone permission across every project linked to a
    // shared process incorrectly blocks a member who is authorized in the
    // selected project only.
    if (!isOrganizationAdmin) {
      await this.access.assertCanReadResource(sourceResourceId, headers);
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
            ? !authorMembership.canSubmitRemarks ||
              ![
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
      const isCommonProcess = sourceLink.usage === ProjectProcessUsage.Common;
      if (
        isCommonProcess &&
        !isViewerRemark &&
        !isOrganizationAdmin &&
        authorMembership?.role !== ProjectMemberRole.Admin
      ) {
        throw new ForbiddenException(
          'Seul le gestionnaire du projet peut soumettre une évolution d’un processus Commun',
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

      const openProposals = await proposals.find({
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
        order: { updatedAt: 'DESC', createdAt: 'DESC' },
      });
      let existingOpenProposal: ProcessChangeProposalTypeOrmEntity | null =
        null;
      let existingCloneDraft: ContentTypeOrmEntity | null = null;
      const proposalsWithDraft = new Set<string>();
      for (const candidate of openProposals) {
        const candidateDraft = await contents.findOne({
          where: {
            resourceId: candidate.cloneResourceId,
            status: ContentStatusEnum.Draft,
          },
          order: { version: 'DESC', updatedAt: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        });
        if (candidateDraft) {
          proposalsWithDraft.add(candidate.id);
          if (!existingOpenProposal) {
            existingOpenProposal = candidate;
            existingCloneDraft = candidateDraft;
          }
        }
      }

      // Orphaned active rows must not permanently block a new request. Close
      // only rows whose own workspace has no draft; preserve every usable
      // historical workspace and its audit trail.
      const orphanedProposals = openProposals.filter(
        (candidate) => !proposalsWithDraft.has(candidate.id),
      );
      for (const orphaned of orphanedProposals) {
        orphaned.status = ProcessChangeProposalStatus.Rejected;
        orphaned.decidedAt = new Date();
        await proposals.save(orphaned);
        await events.save(
          events.create({
            proposalId: orphaned.id,
            eventType: 'rejected',
            actorUserId: authorUserId,
            validatorUserId: orphaned.validatorUserId,
            comment:
              'Demande clôturée automatiquement : brouillon de travail introuvable.',
            details: {
              reason: 'proposal_workspace_missing',
              source: 'workflow_recovery',
            },
            createdBy: authorUsername,
          }),
        );
      }

      if (existingOpenProposal) {
        if (!isViewerRemark) {
          throw new ConflictException(
            'Une demande de modification est déjà ouverte pour cette version du processus',
          );
        }
        const cloneDraft = existingCloneDraft;
        if (!cloneDraft) {
          throw new ConflictException(
            'Le brouillon associé à la demande ouverte est indisponible',
          );
        }
        const validatorResolutionResult = isCommonProcess
          ? {
              validatorUserId: null,
              validatorResolution: 'pilot_missing' as const,
              validatorWarning:
                'La demande concerne le référentiel commun : la revue doit être prise en charge par un responsable habilité du référentiel.',
            }
          : existingOpenProposal.validatorUserId
            ? {
                validatorUserId: existingOpenProposal.validatorUserId,
                validatorResolution: 'pilot_assigned' as const,
                validatorWarning: null,
              }
            : await this.resolveProposalValidator(
                manager,
                members,
                projectId,
                authorUsername,
                authorUserId,
                body.validatorUserId,
              );
        const { validatorUserId, validatorWarning } = validatorResolutionResult;
        const shouldSubmitForReview = [
          ProcessChangeProposalStatus.Draft,
          ProcessChangeProposalStatus.ChangesRequested,
          ProcessChangeProposalStatus.Approved,
        ].includes(existingOpenProposal.status);
        if (shouldSubmitForReview) {
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
          shouldSubmitForReview
        ) {
          existingOpenProposal.validatorUserId = validatorUserId;
          await proposals.save(existingOpenProposal);
        }
        if (shouldSubmitForReview) {
          await events.save(
            events.create({
              proposalId: existingOpenProposal.id,
              eventType: 'submitted',
              actorUserId: authorUserId,
              validatorUserId,
              comment: 'Remarques déposées depuis le Viewer',
              details: {
                submittedContentId: cloneDraft.id,
                source: 'viewer-remark',
                validatorWarning,
              },
              createdBy: authorUsername,
            }),
          );
        }
        const savedRemark = await manager
          .getRepository(ProcessChangeProposalCommentTypeOrmEntity)
          .save(
            manager
              .getRepository(ProcessChangeProposalCommentTypeOrmEntity)
              .create({
                proposalId: existingOpenProposal.id,
                elementId: body.elementId!.trim(),
                authorUserId,
                comment: body.comment!.trim(),
                status: ProcessChangeProposalCommentStatus.Pending,
                decisionBy: null,
                decidedAt: null,
                decisionComment: null,
                createdBy: authorUsername,
              }),
          );
        await events.save(
          events.create({
            proposalId: existingOpenProposal.id,
            eventType: 'remark_added',
            actorUserId: authorUserId,
            validatorUserId,
            comment: savedRemark.comment,
            details: {
              remarkId: savedRemark.id,
              elementId: savedRemark.elementId,
              source: 'viewer-remark',
            },
            createdBy: authorUsername,
          }),
        );
        return {
          id: existingOpenProposal.id,
          projectId,
          sourceResourceId,
          cloneResourceId: existingOpenProposal.cloneResourceId,
          cloneContentId: cloneDraft.id,
          status: existingOpenProposal.status,
          comment: savedRemark,
          validatorWarning,
          reused: true,
        };
      }

      // Every proposal needs its own resource identity: the database
      // deliberately enforces sourceResourceId <> cloneResourceId. For a
      // Common process this workspace stays private to the proposal and is
      // not added as a second project-process link below.
      const { resource: savedClone, content: savedCloneContent } =
        await createProposalWorkspace(manager, {
          source,
          publishedContent: published,
          createdBy: authorUsername,
        });

      // A Common process is already associated with the project as a shared
      // usage. Never create a second project-process link for its working copy.
      if (!isCommonProcess) {
        await links.save(
          links.create({
            projectId,
            resourceId: savedClone.id,
            usage: ProjectProcessUsage.ProjectSpecific,
            sourceResourceId,
            createdBy: authorUsername,
          }),
        );
      }

      const {
        validatorUserId: initialValidatorUserId,
        validatorResolution: initialValidatorResolution,
        validatorWarning: initialValidatorWarning,
      } = isViewerRemark && !isCommonProcess
        ? await this.resolveProposalValidator(
            manager,
            members,
            projectId,
            authorUsername,
            authorUserId,
            body.validatorUserId,
          )
        : {
            validatorUserId: null,
            validatorResolution: 'pilot_missing' as const,
            validatorWarning: isCommonProcess
              ? 'La demande concerne le référentiel commun : la revue doit être prise en charge par un responsable habilité du référentiel.'
              : null,
          };

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

      let initialRemark: ProcessChangeProposalCommentTypeOrmEntity | null =
        null;
      if (isViewerRemark) {
        const comments = manager.getRepository(
          ProcessChangeProposalCommentTypeOrmEntity,
        );
        initialRemark = await comments.save(
          comments.create({
            proposalId: proposal.id,
            elementId: body.elementId!.trim(),
            authorUserId,
            comment: body.comment!.trim(),
            status: ProcessChangeProposalCommentStatus.Pending,
            decisionBy: null,
            decidedAt: null,
            decisionComment: null,
            createdBy: authorUsername,
          }),
        );
        await events.save(
          events.create({
            proposalId: proposal.id,
            eventType: 'submitted',
            actorUserId: authorUserId,
            validatorUserId: initialValidatorUserId,
            comment: 'Remarques déposées depuis le Viewer',
            details: {
              submittedContentId: savedCloneContent.id,
              source: 'viewer-remark',
              validatorResolution: initialValidatorResolution,
              validatorWarning: initialValidatorWarning,
            },
            createdBy: authorUsername,
          }),
        );
        await events.save(
          events.create({
            proposalId: proposal.id,
            eventType: 'remark_added',
            actorUserId: authorUserId,
            validatorUserId: initialValidatorUserId,
            comment: initialRemark.comment,
            details: {
              remarkId: initialRemark.id,
              elementId: initialRemark.elementId,
              source: 'viewer-remark',
            },
            createdBy: authorUsername,
          }),
        );
      }

      return {
        id: proposal.id,
        projectId,
        sourceResourceId,
        cloneResourceId: savedClone.id,
        cloneContentId: savedCloneContent.id,
        status: proposal.status,
        comment: initialRemark,
        validatorWarning: initialValidatorWarning,
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
    await this.assertProjectWorkflowScope(
      existing.projectId,
      existing.sourceResourceId,
    );

    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    const actorUsername = isOrganizationAdmin
      ? this.access.getAuthenticatedUserId(headers)
      : await this.access.assertProjectRole(
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
        !isOrganizationAdmin &&
        (!authorMembership ||
          (authorMembership.role !== ProjectMemberRole.Modeler &&
            authorMembership.role !== ProjectMemberRole.Admin))
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
      // A project modeler/admin may take over corrections for a Viewer-originated request.
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

      const governanceLink = await manager
        .getRepository(ProjectProcessTypeOrmEntity)
        .findOne({
          where: {
            projectId: proposal.projectId,
            resourceId: proposal.sourceResourceId,
          },
          lock: { mode: 'pessimistic_read' },
        });
      if (!governanceLink) {
        throw new NotFoundException(
          'Le processus ne fait plus partie du projet de la demande',
        );
      }
      const isCommonProcess =
        governanceLink.usage === ProjectProcessUsage.Common;

      const submittedContent = await contents.findOne({
        where: {
          resourceId: proposal.cloneResourceId,
          status: ContentStatusEnum.Draft,
        },
        // When a workspace contains more than one draft at the same
        // version, submit the one most recently saved by the modeler.
        order: { updatedAt: 'DESC', version: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!submittedContent) {
        throw new BadRequestException(
          'Le brouillon de travail est introuvable ou n’est plus modifiable',
        );
      }

      const { validatorUserId, validatorResolution, validatorWarning } =
        isCommonProcess
          ? {
              validatorUserId: null,
              validatorResolution: 'pilot_missing' as const,
              validatorWarning:
                'La demande concerne le référentiel commun : la revue doit être prise en charge par un responsable habilité du référentiel.',
            }
          : await this.resolveProposalValidator(
              manager,
              members,
              proposal.projectId,
              actorUsername,
              actorUserId,
              body.validatorUserId?.trim() || proposal.validatorUserId || null,
            );

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
            validatorWarning,
          },
          createdBy: actorUsername,
        }),
      );

      return {
        id: savedProposal.id,
        status: savedProposal.status,
        validatorUserId,
        validatorWarning,
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
    await this.assertProjectWorkflowScope(
      existing.projectId,
      existing.sourceResourceId,
    );

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
      const latestSubmission = await events.findOne({
        where: {
          proposalId,
          eventType: 'submitted',
        },
        order: { createdAt: 'DESC' },
      });
      const lastSubmitterUserId =
        latestSubmission?.actorUserId ?? proposal.authorUserId;
      if (lastSubmitterUserId === actorUserId) {
        throw new ForbiddenException(
          'L’auteur de la dernière soumission ne peut pas approuver ou refuser sa propre demande',
        );
      }
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
      const governanceLink = await manager
        .getRepository(ProjectProcessTypeOrmEntity)
        .findOne({
          where: {
            projectId: proposal.projectId,
            resourceId: proposal.sourceResourceId,
          },
          lock: { mode: 'pessimistic_read' },
        });
      if (!governanceLink) {
        throw new NotFoundException(
          'Le processus ne fait plus partie du projet de la demande',
        );
      }
      if (
        governanceLink.usage === ProjectProcessUsage.Common &&
        !isOrganizationAdmin
      ) {
        throw new ForbiddenException(
          'La validation d’une évolution du référentiel commun relève exclusivement d’un responsable habilité du référentiel',
        );
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
          details: {
            actorRole: isOrganizationAdmin
              ? 'organization_admin'
              : currentMembership?.role === ProjectMemberRole.Admin
                ? 'project_admin'
                : 'designated_validator',
          },
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
    await this.assertProjectWorkflowScope(
      existing.projectId,
      existing.sourceResourceId,
    );

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
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );
      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      const proposalComments = manager.getRepository(
        ProcessChangeProposalCommentTypeOrmEntity,
      );

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
      const governanceLink = await manager
        .getRepository(ProjectProcessTypeOrmEntity)
        .findOne({
          where: {
            projectId: proposal.projectId,
            resourceId: proposal.sourceResourceId,
          },
          lock: { mode: 'pessimistic_read' },
        });
      if (!governanceLink) {
        throw new NotFoundException(
          'Le processus ne fait plus partie du projet de la demande',
        );
      }
      if (
        governanceLink.usage === ProjectProcessUsage.Common &&
        !isOrganizationAdmin
      ) {
        throw new ForbiddenException(
          'La publication du référentiel commun relève exclusivement d’un responsable habilité du référentiel',
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
      const remarkUserIds = [
        ...new Set(
          remarks.flatMap((remark) => [
            remark.authorUserId,
            ...(remark.decisionBy ? [remark.decisionBy] : []),
          ]),
        ),
      ];
      const remarkUsers: Array<{
        id: string;
        username: string;
        email: string | null;
      }> = remarkUserIds.length
        ? await manager.query(
            'SELECT id, username, email FROM app_users WHERE id = ANY($1::uuid[])',
            [remarkUserIds],
          )
        : [];
      const remarkUserNameById = new Map(
        remarkUsers.map((user) => [
          user.id,
          user.username || user.email || user.id,
        ]),
      );
      const pendingRemarks = remarks.filter(
        (remark) =>
          remark.status === ProcessChangeProposalCommentStatus.Pending,
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

      const changeComment = [
        summaryComment,
        'Synthèse des remarques contextuelles :',
        ...remarks.map(
          (remark) =>
            `- [${remark.status}] ${remark.createdAt.toISOString()} · auteur ${remarkUserNameById.get(remark.authorUserId) ?? remark.authorUserId} · élément ${remark.elementId} · ${remark.comment}${remark.decidedAt ? ` · décidé le ${remark.decidedAt.toISOString()} par ${remarkUserNameById.get(remark.decisionBy!) ?? remark.decisionBy}` : ''}${remark.decisionComment ? ` · décision : ${remark.decisionComment}` : ''}`,
        ),
      ].join('\n');
      const newPublished = await publishProposalWorkspace(manager, {
        sourceResourceId: proposal.sourceResourceId,
        workspaceResourceId: proposal.cloneResourceId,
        submittedContentId: proposal.submittedContentId,
        expectedSourceContentId: proposal.sourcePublishedContentId,
        updatedBy: actorUsername,
        pngContent,
        changeComment,
      });

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
            actorRole: isOrganizationAdmin
              ? 'organization_admin'
              : currentMembership?.role === ProjectMemberRole.Admin
                ? 'project_admin'
                : 'designated_validator',
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
  /**
   * Return the exact BPMN snapshot submitted for review. Reviewers read it
   * through the proposal scope so common-process workspaces do not depend
   * on direct access to the private clone resource.
   */
  @Get('process-change-proposals/:proposalId/content')
  @UseAcl()
  async getProposalContent(
    @Param('proposalId') proposalId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const proposal = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    await this.assertProjectWorkflowScope(
      proposal.projectId,
      proposal.sourceResourceId,
    );
    if (!this.access.hasOrganizationAdminRole(headers)) {
      await this.access.assertProjectRole(
        proposal.projectId,
        headers,
        ProjectMemberRole.Viewer,
      );
    }
    if (!proposal.submittedContentId) {
      throw new ConflictException(
        'La demande ne contient aucune version soumise',
      );
    }
    const content = await this.dataSource
      .getRepository(ContentTypeOrmEntity)
      .findOne({
        where: {
          id: proposal.submittedContentId,
          resourceId: proposal.cloneResourceId,
        },
      });
    if (!content) {
      throw new NotFoundException('Version BPMN soumise introuvable');
    }
    return content.content;
  }

  @Get('process-change-proposals/:proposalId/comments')
  @UseAcl()
  async listProposalComments(
    @Param('proposalId') proposalId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const proposal = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    await this.assertProjectWorkflowScope(
      proposal.projectId,
      proposal.sourceResourceId,
    );
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
    const remarkEvents = await this.events.find({
      where: { proposalId },
      order: { createdAt: 'ASC' },
    });
    const eventsByRemark = new Map<string, ProcessChangeProposalEventTypeOrmEntity[]>();
    for (const event of remarkEvents) {
      const remarkId = typeof event.details?.remarkId === 'string'
        ? event.details.remarkId
        : null;
      if (!remarkId) continue;
      const thread = eventsByRemark.get(remarkId) ?? [];
      thread.push(event);
      eventsByRemark.set(remarkId, thread);
    }
    const currentUserId = await this.resolveAccountId(
      this.access.getAuthenticatedUserId(headers),
    );
    const userIds = [
      ...new Set([
        ...comments.flatMap((comment) => [
          comment.authorUserId,
          ...(comment.decisionBy ? [comment.decisionBy] : []),
        ]),
        ...remarkEvents.map((event) => event.actorUserId).filter((id): id is string => Boolean(id)),
      ]),
    ];
    const users: Array<{ id: string; username: string; email: string | null }> =
      await this.dataSource.query(
        'SELECT id, username, email FROM app_users WHERE id = ANY($1::uuid[])',
        [userIds],
      );
    const userNameById = new Map(
      users.map((user) => [user.id, user.username || user.email || user.id]),
    );
    return comments.map((comment) => ({
      ...comment,
      authorName:
        userNameById.get(comment.authorUserId) ?? comment.authorUserId,
      decisionByName: comment.decisionBy
        ? (userNameById.get(comment.decisionBy) ?? comment.decisionBy)
        : null,
      canRespond: comment.authorUserId === currentUserId &&
        comment.status === ProcessChangeProposalCommentStatus.Pending &&
        (() => {
          const thread = eventsByRemark.get(comment.id) ?? [];
          const latest = thread[thread.length - 1];
          return latest?.eventType === 'remark_clarification_requested';
        })(),
      thread: (eventsByRemark.get(comment.id) ?? []).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        actorUserId: event.actorUserId,
        actorName: event.actorUserId
          ? (userNameById.get(event.actorUserId) ?? event.actorUserId)
          : null,
        comment: event.comment,
        createdAt: event.createdAt,
      })),
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
    const proposal = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    await this.assertProjectWorkflowScope(
      proposal.projectId,
      proposal.sourceResourceId,
    );
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    if (!isOrganizationAdmin) {
      await this.assertCanSubmitRemarks(proposal.projectId, headers);
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
      const proposals = manager.getRepository(
        ProcessChangeProposalTypeOrmEntity,
      );
      const comments = manager.getRepository(
        ProcessChangeProposalCommentTypeOrmEntity,
      );
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );
      const lockedProposal = await proposals.findOne({
        where: { id: proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedProposal) throw new NotFoundException('Demande introuvable');
      const currentMembership = await manager
        .getRepository(ProjectMemberTypeOrmEntity)
        .findOne({
          where: { projectId: lockedProposal.projectId, userId: actorUsername },
        });
      if (
        !isOrganizationAdmin &&
        (!currentMembership || !currentMembership.canSubmitRemarks)
      ) {
        throw new ForbiddenException(
          'Le droit de déposer des remarques a été retiré ; la remarque ne peut pas être ajoutée',
        );
      }
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
        await events.save(
          events.create({
            proposalId,
            eventType: 'submitted',
            actorUserId: authorUserId,
            validatorUserId: lockedProposal.validatorUserId,
            comment: 'Nouvelle remarque ajoutée après approbation',
            details: { reopenedByRemark: true },
            createdBy: actorUsername,
          }),
        );
      }
      const savedComment = await comments.save(
        comments.create({
          proposalId,
          elementId,
          authorUserId,
          comment,
          status: ProcessChangeProposalCommentStatus.Pending,
          decisionBy: null,
          decidedAt: null,
          decisionComment: null,
          createdBy: actorUsername,
        }),
      );
      await events.save(
        events.create({
          proposalId,
          eventType: 'remark_added',
          actorUserId: authorUserId,
          validatorUserId: lockedProposal.validatorUserId,
          comment: savedComment.comment,
          details: {
            remarkId: savedComment.id,
            elementId: savedComment.elementId,
            source: 'modeler-remark',
          },
          createdBy: actorUsername,
        }),
      );
      return savedComment;
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
    const proposal = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    await this.assertProjectWorkflowScope(
      proposal.projectId,
      proposal.sourceResourceId,
    );
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
    const canReviewAsProjectAdmin =
      membership?.role === ProjectMemberRole.Admin;
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
    if (body.decision === 'rejected' && !decisionComment) {
      throw new BadRequestException(
        'Un motif est obligatoire pour refuser une remarque',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const lockedProposal = await manager
        .getRepository(ProcessChangeProposalTypeOrmEntity)
        .findOne({
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
      const governanceLink = await manager
        .getRepository(ProjectProcessTypeOrmEntity)
        .findOne({
          where: {
            projectId: lockedProposal.projectId,
            resourceId: lockedProposal.sourceResourceId,
          },
          lock: { mode: 'pessimistic_read' },
        });
      if (!governanceLink) {
        throw new NotFoundException(
          'Le processus ne fait plus partie du projet de la demande',
        );
      }
      if (
        governanceLink.usage === ProjectProcessUsage.Common &&
        !isOrganizationAdmin
      ) {
        throw new ForbiddenException(
          'Le traitement des remarques sur un processus Commun relève exclusivement d’un responsable habilité du référentiel',
        );
      }
      const currentMembership = await manager
        .getRepository(ProjectMemberTypeOrmEntity)
        .findOne({
          where: { projectId: lockedProposal.projectId, userId: actorUsername },
        });
      const canStillReviewAsProjectAdmin =
        currentMembership?.role === ProjectMemberRole.Admin;
      const canStillReviewAsAssignedValidator =
        lockedProposal.validatorUserId === actorUserId &&
        (currentMembership?.role === ProjectMemberRole.Admin ||
          currentMembership?.role === ProjectMemberRole.Modeler);
      if (
        !isOrganizationAdmin &&
        !canStillReviewAsProjectAdmin &&
        !canStillReviewAsAssignedValidator
      ) {
        throw new ForbiddenException(
          'Vos droits de traitement ont changé ; cette remarque ne peut plus être décidée',
        );
      }
      const comments = manager.getRepository(
        ProcessChangeProposalCommentTypeOrmEntity,
      );
      const current = await comments.findOne({
        where: { id: commentId, proposalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) throw new NotFoundException('Remarque introuvable');
      if (current.authorUserId === actorUserId) {
        throw new ForbiddenException(
          'L’auteur ne peut pas décider de sa propre remarque',
        );
      }
      if (current.status !== ProcessChangeProposalCommentStatus.Pending) {
        throw new ConflictException(
          'Cette remarque a déjà fait l’objet d’une décision',
        );
      }
      current.status =
        body.decision === 'accepted'
          ? ProcessChangeProposalCommentStatus.Accepted
          : ProcessChangeProposalCommentStatus.Rejected;
      current.decisionBy = actorUserId;
      current.decidedAt = new Date();
      current.decisionComment = decisionComment || null;
      const savedComment = await comments.save(current);
      await manager.getRepository(ProcessChangeProposalEventTypeOrmEntity).save(
        manager.getRepository(ProcessChangeProposalEventTypeOrmEntity).create({
          proposalId,
          eventType:
            body.decision === 'accepted'
              ? 'remark_accepted'
              : 'remark_rejected',
          actorUserId,
          validatorUserId: lockedProposal.validatorUserId,
          comment: decisionComment || null,
          details: {
            remarkId: savedComment.id,
            elementId: savedComment.elementId,
            decision: body.decision,
            actorRole: isOrganizationAdmin
              ? 'organization_admin'
              : currentMembership?.role === ProjectMemberRole.Admin
                ? 'project_admin'
                : 'designated_validator',
          },
          createdBy: actorUsername,
        }),
      );
      return savedComment;
    });
  }

  /**
   * Ask the remark author for clarification without changing the remark's
   * business status. The event stream is the source of truth for the thread.
   */
  @Post('process-change-proposals/:proposalId/comments/:commentId/clarification')
  @UseAcl()
  async requestRemarkClarification(
    @Param('proposalId') proposalId: string,
    @Param('commentId') commentId: string,
    @Body() body: { comment?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const text = body.comment?.trim() ?? '';
    if (!text) throw new BadRequestException('Le texte de la demande de précision est obligatoire');
    const proposal = await this.proposals.findOne({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    await this.assertProjectWorkflowScope(proposal.projectId, proposal.sourceResourceId);
    const actorUsername = this.access.getAuthenticatedUserId(headers);
    const actorUserId = await this.resolveAccountId(actorUsername);
    const isOrganizationAdmin = this.access.hasOrganizationAdminRole(headers);
    const membership = await this.members.findOne({
      where: { projectId: proposal.projectId, userId: actorUsername },
    });
    const canReview = isOrganizationAdmin ||
      membership?.role === ProjectMemberRole.Admin ||
      (proposal.validatorUserId === actorUserId &&
        membership?.role === ProjectMemberRole.Modeler);
    if (!canReview) {
      throw new ForbiddenException('Seul le validateur désigné ou un administrateur habilité peut demander une précision');
    }
    return this.dataSource.transaction(async (manager) => {
      const lockedProposal = await manager.getRepository(ProcessChangeProposalTypeOrmEntity).findOne({
        where: { id: proposalId }, lock: { mode: 'pessimistic_write' },
      });
      if (!lockedProposal) throw new NotFoundException('Demande introuvable');
      if ([ProcessChangeProposalStatus.Rejected, ProcessChangeProposalStatus.Published].includes(lockedProposal.status)) {
        throw new ConflictException('La demande est clôturée');
      }
      const governance = await manager.getRepository(ProjectProcessTypeOrmEntity).findOne({
        where: { projectId: lockedProposal.projectId, resourceId: lockedProposal.sourceResourceId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!governance) throw new NotFoundException('Le processus ne fait plus partie du projet');
      if (governance.usage === ProjectProcessUsage.Common && !isOrganizationAdmin) {
        throw new ForbiddenException('Seul un administrateur global peut traiter les remarques du référentiel commun');
      }
      const currentMembership = await manager.getRepository(ProjectMemberTypeOrmEntity).findOne({
        where: { projectId: lockedProposal.projectId, userId: actorUsername },
      });
      if (!isOrganizationAdmin &&
        currentMembership?.role !== ProjectMemberRole.Admin &&
        !(lockedProposal.validatorUserId === actorUserId &&
          currentMembership?.role === ProjectMemberRole.Modeler)) {
        throw new ForbiddenException('Vos droits de validation ont changé');
      }
      const comments = manager.getRepository(ProcessChangeProposalCommentTypeOrmEntity);
      const remark = await comments.findOne({
        where: { id: commentId, proposalId }, lock: { mode: 'pessimistic_write' },
      });
      if (!remark) throw new NotFoundException('Remarque introuvable');
      if (remark.status !== ProcessChangeProposalCommentStatus.Pending) {
        throw new ConflictException('Cette remarque a déjà fait l’objet d’une décision');
      }
      if (remark.authorUserId === actorUserId) {
        throw new ForbiddenException('L’auteur ne peut pas demander une précision sur sa propre remarque');
      }
      const events = manager.getRepository(ProcessChangeProposalEventTypeOrmEntity);
      const latest = await events.findOne({
        where: { proposalId }, order: { createdAt: 'DESC' },
      });
      // A clarification request may be repeated only after the author answered.
      const remarkEvents = await events.find({ where: { proposalId }, order: { createdAt: 'DESC' } });
      const latestForRemark = remarkEvents.find((event) => event.details?.remarkId === remark.id);
      if (latestForRemark?.eventType === 'remark_clarification_requested') {
        throw new ConflictException('Une demande de précision attend déjà la réponse de l’auteur');
      }
      const saved = await events.save(events.create({
        proposalId,
        eventType: 'remark_clarification_requested',
        actorUserId,
        validatorUserId: lockedProposal.validatorUserId,
        comment: text,
        details: { remarkId: remark.id, elementId: remark.elementId },
        createdBy: actorUsername,
      }));
      return { id: saved.id, eventType: saved.eventType, comment: saved.comment, createdAt: saved.createdAt };
    });
  }

  /**
   * Only the original remark author may answer the latest outstanding
   * clarification request. The remark remains pending for final review.
   */
  @Post('process-change-proposals/:proposalId/comments/:commentId/response')
  @UseAcl()
  async respondToRemarkClarification(
    @Param('proposalId') proposalId: string,
    @Param('commentId') commentId: string,
    @Body() body: { comment?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const text = body.comment?.trim() ?? '';
    if (!text) throw new BadRequestException('La réponse à la demande de précision est obligatoire');
    const proposal = await this.proposals.findOne({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Demande introuvable');
    await this.assertProjectWorkflowScope(proposal.projectId, proposal.sourceResourceId);
    const actorUsername = this.access.getAuthenticatedUserId(headers);
    const actorUserId = await this.resolveAccountId(actorUsername);
    const membership = await this.members.findOne({
      where: { projectId: proposal.projectId, userId: actorUsername },
    });
    if (!membership) throw new ForbiddenException('Un accès actif au projet est requis pour répondre');
    return this.dataSource.transaction(async (manager) => {
      const lockedProposal = await manager.getRepository(ProcessChangeProposalTypeOrmEntity).findOne({
        where: { id: proposalId }, lock: { mode: 'pessimistic_write' },
      });
      if (!lockedProposal) throw new NotFoundException('Demande introuvable');
      if ([ProcessChangeProposalStatus.Rejected, ProcessChangeProposalStatus.Published].includes(lockedProposal.status)) {
        throw new ConflictException('La demande est clôturée');
      }
      const remark = await manager.getRepository(ProcessChangeProposalCommentTypeOrmEntity).findOne({
        where: { id: commentId, proposalId }, lock: { mode: 'pessimistic_write' },
      });
      if (!remark) throw new NotFoundException('Remarque introuvable');
      if (remark.authorUserId !== actorUserId) {
        throw new ForbiddenException('Seul l’auteur de la remarque peut répondre');
      }
      if (remark.status !== ProcessChangeProposalCommentStatus.Pending) {
        throw new ConflictException('Cette remarque a déjà fait l’objet d’une décision');
      }
      const events = manager.getRepository(ProcessChangeProposalEventTypeOrmEntity);
      const history = await events.find({ where: { proposalId }, order: { createdAt: 'ASC' } });
      const thread = history.filter((event) => event.details?.remarkId === remark.id);
      const latest = thread[thread.length - 1];
      if (latest?.eventType !== 'remark_clarification_requested') {
        throw new ConflictException('Aucune demande de précision n’attend de réponse');
      }
      const saved = await events.save(events.create({
        proposalId,
        eventType: 'remark_author_responded',
        actorUserId,
        validatorUserId: lockedProposal.validatorUserId,
        comment: text,
        details: { remarkId: remark.id, elementId: remark.elementId },
        createdBy: actorUsername,
      }));
      return { id: saved.id, eventType: saved.eventType, comment: saved.comment, createdAt: saved.createdAt };
    });
  }

  private async resolveProposalValidator(
    manager: EntityManager,
    members: Repository<ProjectMemberTypeOrmEntity>,
    projectId: string,
    actorUsername: string,
    actorUserId: string,
    pilotIdentifier?: string | null,
  ): Promise<{
    validatorUserId: string | null;
    validatorResolution:
      | 'pilot_assigned'
      | 'project_default_assigned'
      | 'pilot_missing'
      | 'pilot_invalid'
      | 'project_default_invalid';
    validatorWarning: string | null;
  }> {
    let validatorUserId: string | null = null;
    let validatorResolution:
      | 'pilot_assigned'
      | 'project_default_assigned'
      | 'pilot_missing'
      | 'pilot_invalid'
      | 'project_default_invalid' = pilotIdentifier?.trim()
      ? 'pilot_invalid'
      : 'pilot_missing';

    // The BPMN process pilot has priority over the project-level default.
    if (pilotIdentifier?.trim()) {
      const pilotRows: Array<{ id: string; username: string }> =
        await manager.query(
          'SELECT id, username FROM app_users WHERE (lower(username) = lower($1) OR lower(email) = lower($1) OR id::text = $1) AND active = TRUE LIMIT 1',
          [pilotIdentifier.trim()],
        );
      const pilot = pilotRows[0];
      if (pilot && pilot.id !== actorUserId) {
        const pilotMembership = await members.findOne({
          where: { projectId, userId: pilot.username },
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
    }

    // If no eligible pilot can be assigned, use only the explicitly configured
    // project default. Do not silently select an arbitrary project administrator.
    if (!validatorUserId) {
      const project = await manager
        .getRepository(ProjectTypeOrmEntity)
        .findOneBy({ id: projectId });
      const defaultUserId = project?.defaultValidatorUserId?.trim();
      if (defaultUserId) {
        const defaultMembership = await members.findOne({
          where: { projectId, userId: defaultUserId },
        });
        if (
          defaultMembership &&
          (defaultMembership.role === ProjectMemberRole.Admin ||
            defaultMembership.role === ProjectMemberRole.Modeler)
        ) {
          const defaultRows: Array<{ id: string }> = await manager.query(
            'SELECT id FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
            [defaultMembership.userId],
          );
          if (defaultRows[0]?.id && defaultRows[0].id !== actorUserId) {
            validatorUserId = defaultRows[0].id;
            validatorResolution = 'project_default_assigned';
          } else {
            validatorResolution = 'project_default_invalid';
          }
        } else {
          validatorResolution = 'project_default_invalid';
        }
      }
    }

    let validatorWarning: string | null = null;
    if (!validatorUserId) {
      const pilotMessage = pilotIdentifier?.trim()
        ? 'Le pilote du processus est absent, non actif, non membre du projet ou non habilité.'
        : 'Aucun pilote n’est renseigné sur le processus.';
      const defaultMessage =
        validatorResolution === 'project_default_invalid'
          ? 'Le valideur par défaut du projet est absent, inactif, non habilité ou correspond à l’auteur.'
          : 'Aucun valideur par défaut valide n’est configuré dans le projet.';
      validatorWarning = `${pilotMessage} ${defaultMessage}`;
    }

    return {
      validatorUserId,
      validatorResolution,
      validatorWarning,
    };
  }

  private async assertCanSubmitRemarks(
    projectId: string,
    headers: RequestHeaders,
  ): Promise<string> {
    const username = this.access.getAuthenticatedUserId(headers);
    if (this.access.hasOrganizationAdminRole(headers)) return username;
    const membership = await this.members.findOne({
      where: { projectId, userId: username },
    });
    if (!membership?.canSubmitRemarks) {
      throw new ForbiddenException(
        'Le droit de déposer des remarques n’est pas activé pour ce membre du projet',
      );
    }
    return username;
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
