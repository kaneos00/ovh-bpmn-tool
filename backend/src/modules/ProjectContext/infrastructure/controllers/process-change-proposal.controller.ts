import { Controller, Get, Headers } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';
import { ProjectTypeOrmEntity } from '../entities/project.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../entities/projectProcess.ormEntity';
import { ProjectMemberTypeOrmEntity } from '../entities/projectMember.ormEntity';
import { ProcessChangeProposalTypeOrmEntity } from '../entities/processChangeProposal.ormEntity';
import { ProcessChangeProposalEventTypeOrmEntity } from '../entities/processChangeProposalEvent.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

@Controller('projects')
export class ProcessChangeProposalController {
  constructor(
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

    const projectIds = [...new Set(authored.map((proposal) => proposal.projectId))];
    const [memberships, projects, links, resources] = await Promise.all([
      this.members.find({ where: { userId, projectId: In(projectIds) } }),
      this.projects.find({ where: { id: In(projectIds) } }),
      this.projectProcesses.find({
        where: { projectId: In(projectIds) },
      }),
      this.resources.find({
        where: { id: In(authored.map((proposal) => proposal.sourceResourceId)) },
      }),
    ]);
    const membershipIds = new Set(memberships.map((membership) => membership.projectId));
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
    const linkByKey = new Map(links.map((link) => [`${link.projectId}:${link.resourceId}`, link]));
    const visible = authored.filter((proposal) =>
      membershipIds.has(proposal.projectId) &&
      linkByKey.has(`${proposal.projectId}:${proposal.sourceResourceId}`),
    );
    if (!visible.length) return [];

    const events = await this.events.find({
      where: { proposalId: In(visible.map((proposal) => proposal.id)) },
      order: { createdAt: 'DESC' },
    });
    const latestEventByProposal = new Map<string, ProcessChangeProposalEventTypeOrmEntity>();
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
}
