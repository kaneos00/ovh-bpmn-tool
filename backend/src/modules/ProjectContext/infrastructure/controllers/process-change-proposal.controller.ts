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
    const userId = this.access.getAuthenticatedUserId(headers);
    const authored = await this.proposals.find({
      where: { authorUserId: userId },
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!authored.length) return [];

    const projectIds = [
      ...new Set(authored.map((proposal) => proposal.projectId)),
    ];
    const [memberships, projects, links, resources] = await Promise.all([
      this.members.find({ where: { userId, projectId: In(projectIds) } }),
      this.projects.find({ where: { id: In(projectIds) } }),
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
        status: proposal.status,
        submissionComment: proposal.submissionComment,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        submittedAt: proposal.submittedAt,
        decidedAt: proposal.decidedAt,
        latestActivityAt: latestEvent?.createdAt ?? proposal.updatedAt,
        latestActivityType: latestEvent?.eventType ?? 'created',
        latestActivityComment: latestEvent?.comment ?? null,
      };
    });
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
    @Headers() headers: RequestHeaders,
  ) {
    const authorUserId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );

    return this.dataSource.transaction(async (manager) => {
      const resources = manager.getRepository(ResourceTypeOrmEntity);
      const contents = manager.getRepository(ContentTypeOrmEntity);
      const links = manager.getRepository(ProjectProcessTypeOrmEntity);
      const proposals = manager.getRepository(
        ProcessChangeProposalTypeOrmEntity,
      );
      const events = manager.getRepository(
        ProcessChangeProposalEventTypeOrmEntity,
      );

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

      const existingDraft = await proposals.findOne({
        where: {
          projectId,
          sourceResourceId,
          authorUserId,
          status: ProcessChangeProposalStatus.Draft,
        },
      });
      if (existingDraft) {
        throw new ConflictException(
          'Vous avez déjà une demande brouillon pour ce processus',
        );
      }

      const cloneResource = resources.create({
        name: `${source.name} — proposition ${randomUUID().slice(0, 8)}`,
        description: source.description,
        depth: source.depth,
        parentId: source.parentId,
        sourceResourceId: source.id,
        type: ResourceTypeEnum.Process,
        authToken: null,
        createdBy: authorUserId,
      });
      const savedClone = await resources.save(cloneResource);

      const cloneContent = contents.create({
        resourceId: savedClone.id,
        status: ContentStatusEnum.Draft,
        version: 1,
        content: published.content,
        changeComment: null,
        pngContent: null,
        updatedBy: authorUserId,
        createdBy: authorUserId,
      });
      const savedCloneContent = await contents.save(cloneContent);

      await links.save(
        links.create({
          projectId,
          resourceId: savedClone.id,
          usage: ProjectProcessUsage.ProjectSpecific,
          sourceResourceId,
          createdBy: authorUserId,
        }),
      );

      const proposal = await proposals.save(
        proposals.create({
          projectId,
          sourceResourceId,
          cloneResourceId: savedClone.id,
          sourcePublishedContentId: published.id,
          submittedContentId: null,
          authorUserId,
          validatorUserId: null,
          status: ProcessChangeProposalStatus.Draft,
          submissionComment: null,
          submittedAt: null,
          decidedAt: null,
          createdBy: authorUserId,
        }),
      );

      await events.save(
        events.create({
          proposalId: proposal.id,
          eventType: 'created',
          actorUserId: authorUserId,
          validatorUserId: null,
          comment: null,
          details: {
            sourcePublishedContentId: published.id,
            cloneResourceId: savedClone.id,
            cloneContentId: savedCloneContent.id,
          },
          createdBy: authorUserId,
        }),
      );

      return {
        id: proposal.id,
        projectId,
        sourceResourceId,
        cloneResourceId: savedClone.id,
        cloneContentId: savedCloneContent.id,
        status: proposal.status,
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

    const actorUserId = await this.access.assertProjectRole(
      existing.projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
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

      let validatorUserId =
        body.validatorUserId?.trim() || proposal.validatorUserId;
      if (!validatorUserId) {
        const admins = await members.find({
          where: {
            projectId: proposal.projectId,
            role: ProjectMemberRole.Admin,
          },
          order: { createdAt: 'ASC' },
        });
        validatorUserId =
        admins.find((member) => member.userId !== actorUserId)?.userId ?? null;
      }
      if (!validatorUserId || validatorUserId === actorUserId) {
        throw new BadRequestException(
          'Désignez un validateur membre du projet, différent de l’auteur',
        );
      }

      const validator = await members.findOne({
        where: { projectId: proposal.projectId, userId: validatorUserId },
      });
      if (
        !validator ||
        (validator.role !== ProjectMemberRole.Admin &&
          validator.role !== ProjectMemberRole.Modeler)
      ) {
        throw new BadRequestException(
          'Le validateur doit être membre du projet avec un rôle Modeleur ou Administrateur',
        );
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
          details: { submittedContentId: submittedContent.id },
          createdBy: actorUserId,
        }),
      );

      return {
        id: savedProposal.id,
        status: savedProposal.status,
        validatorUserId,
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

    const actorUserId = await this.access.assertProjectRole(
      existing.projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
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
      const currentMembership = await members.findOne({
        where: { projectId: proposal.projectId, userId: actorUserId },
      });
      if (
        proposal.validatorUserId !== actorUserId &&
        currentMembership?.role !== ProjectMemberRole.Admin
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
          createdBy: actorUserId,
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
    @Body() body: { pngContent?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const existing = await this.proposals.findOne({
      where: { id: proposalId },
    });
    if (!existing) throw new NotFoundException('Demande introuvable');

    const actorUserId = await this.access.assertProjectRole(
      existing.projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const pngContent = body.pngContent?.trim();
    if (!pngContent) {
      throw new BadRequestException(
        'La prévisualisation PNG du processus est obligatoire pour publier',
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
        where: { projectId: proposal.projectId, userId: actorUserId },
      });
      if (
        proposal.validatorUserId !== actorUserId &&
        currentMembership?.role !== ProjectMemberRole.Admin
      ) {
        throw new ForbiddenException(
          'Seul le validateur désigné ou un administrateur du projet peut publier',
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
      currentPublished.updatedBy = actorUserId;
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
          changeComment: proposal.submissionComment,
          pngContent: Buffer.from(
            pngContent.replace(/^data:image\/png;base64,/, ''),
            'base64',
          ),
          updatedBy: actorUserId,
          createdBy: actorUserId,
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
          createdBy: actorUserId,
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
}
