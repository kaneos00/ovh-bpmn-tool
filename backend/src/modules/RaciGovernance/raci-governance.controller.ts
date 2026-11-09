import { Controller, Get, Headers } from '@nestjs/common';
import { UseAcl } from '../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../shared-kernel/utils/UserGroup';
import { ProjectRaciApplicationService } from '../ProjectContext/project-raci.application.service';
import { ActorLabelNormalizer } from './domain/actor-label.normalizer';

type RequestHeaders = Record<string, string | undefined>;

@Controller('admin/raci-governance')
export class RaciGovernanceController {
  constructor(private readonly projectRaci: ProjectRaciApplicationService) {}

  /**
   * First MVP slice: read-only cross-project actor inventory and exact
   * normalized-name duplicate candidates. No mutation is exposed here.
   */
  @Get('actors')
  @UseAcl([UserGroup.Admin])
  async getActorInventory(@Headers() headers: RequestHeaders) {
    const actors = (
      await this.projectRaci.readOrganizationActorInventory(headers)
    );
    const grouped = new Map<string, typeof actors>();

    for (const actor of actors) {
      const normalizedName = ActorLabelNormalizer.normalize(actor.actorName);
      if (!normalizedName) continue;
      const group = grouped.get(normalizedName) ?? [];
      group.push(actor);
      grouped.set(normalizedName, group);
    }

    const duplicateCandidates = [...grouped.entries()]
      .filter(
        ([, matches]) =>
          new Set(matches.map((item) => item.projectId)).size > 1,
      )
      .map(([normalizedName, matches]) => ({
        normalizedName,
        actorCount: matches.length,
        projectCount: new Set(matches.map((item) => item.projectId)).size,
        actors: matches,
      }));

    return {
      readOnly: true,
      totalActors: actors.length,
      projectsCount: new Set(actors.map((actor) => actor.projectId)).size,
      duplicateCandidates,
      actors,
    };
  }
}
