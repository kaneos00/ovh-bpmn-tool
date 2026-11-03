import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ResourceTypeEnum } from '../../../ResourceContext/shared/types/Resource';
import { ProjectMemberRole, ProjectMemberTypeOrmEntity } from '../entities/projectMember.ormEntity';
import { ProjectProcessUsage } from '../entities/projectProcess.ormEntity';
import { ProcessChangeProposalStatus } from '../entities/processChangeProposal.ormEntity';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';
import { ProjectTypeOrmEntity } from '../entities/project.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../entities/projectProcess.ormEntity';
import { ProjectMemberTypeOrmEntity } from '../entities/projectMember.ormEntity';
import { ProcessChangeProposalTypeOrmEntity } from '../entities/processChangeProposal.ormEntity';
import { ProcessChangeProposalEventTypeOrmEntity } from '../entities/processChangeProposalEvent.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';

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
      const proposals = manager.getRepository(ProcessChangeProposalTypeOrmEntity);
      const events = manager.getRepository(ProcessChangeProposalEventTypeOrmEntity);

      const sourceLink = await links.findOne({
        where: { projectId, resourceId: sourceResourceId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!sourceLink) {
        throw new NotFoundException('Le processus ne fait pas partie de ce projet');
      }

      const source = await resources.findOne({
        where: { id: sourceResourceId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!source || source.type !== ResourceTypeEnum.Process) {
        throw new NotFoundException('Processus source introuvable');
      }

      const published = await contents.findOne({
        where: { resourceId: sourceResourceId, status: ContentStatusEnum.Published },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_read' },
      });
      if (!published) {
        throw new BadRequestException('Il n’existe aucune versione pubblicata da proporre');
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
        throw new ConflictException('Vous avez déjà une demande brouillon pour ce processus');
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

      await links.save(links.create({
        projectId,
        resourceId: savedClone.id,
        usage: ProjectProcessUsage.ProjectSpecific,
        sourceResourceId,
        createdBy: authorUserId,
      }));

      const proposal = await proposals.save(proposals.create({
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
      }));

      await events.save(events.create({
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
      }));

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

}
