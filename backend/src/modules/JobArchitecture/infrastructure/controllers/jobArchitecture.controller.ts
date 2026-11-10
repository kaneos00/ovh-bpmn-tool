import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { JobArchitectureService } from '../../jobArchitecture.service';

type RequestHeaders = Record<string, string | undefined>;

@Controller()
export class JobArchitectureController {
  constructor(private readonly jobArchitecture: JobArchitectureService) {}

  @Get('job-architecture/functions')
  @UseAcl()
  listFunctions() {
    return this.jobArchitecture.listFunctions();
  }

  @Post('job-architecture/functions')
  @UseAcl([UserGroup.Admin])
  createFunction(
    @Body()
    body: {
      code?: string;
      name?: string;
      description?: string | null;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.createFunction(body, headers);
  }

  @Post('job-architecture/competency-blocks')
  @UseAcl([UserGroup.Admin])
  createBlock(
    @Body()
    body: {
      code?: string;
      name?: string;
      description?: string | null;
      sortOrder?: number;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.createBlock(body, headers);
  }

  @Post('job-architecture/competency-blocks/:blockId/competencies')
  @UseAcl([UserGroup.Admin])
  createCompetency(
    @Param('blockId') blockId: string,
    @Body()
    body: {
      code?: string;
      name?: string;
      description?: string | null;
      referenceLevel?: number | null;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.createCompetency(blockId, body, headers);
  }

  @Post('job-architecture/functions/:functionId/blocks/:blockId')
  @UseAcl([UserGroup.Admin])
  addBlockToFunction(
    @Param('functionId') functionId: string,
    @Param('blockId') blockId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.addBlockToFunction(
      functionId,
      blockId,
      headers,
    );
  }

  @Get('projects/:projectId/job-positions')
  @UseAcl()
  listProjectPositions(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.listProjectPositions(projectId, headers);
  }

  @Post('projects/:projectId/job-positions')
  @UseAcl([UserGroup.RW])
  createProjectPosition(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      functionId?: string;
      title?: string;
      description?: string | null;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.createProjectPosition(projectId, body, headers);
  }

  @Patch('projects/:projectId/job-positions/:positionId/competency-blocks')
  @UseAcl([UserGroup.RW])
  replacePositionBlocks(
    @Param('projectId') projectId: string,
    @Param('positionId') positionId: string,
    @Body()
    body: {
      blocks?: Array<{
        blockId?: string;
        applicability?:
          | 'required'
          | 'optional'
          | 'not_applicable'
          | 'not_assessed';
        requiredLevel?: number | null;
      }>;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.replacePositionBlocks(
      projectId,
      positionId,
      body,
      headers,
    );
  }

  @Get('projects/:projectId/job-positions/:positionId/mappings')
  @UseAcl()
  listPositionMappings(
    @Param('projectId') projectId: string,
    @Param('positionId') positionId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.listPositionMappings(
      projectId,
      positionId,
      headers,
    );
  }

  @Post('projects/:projectId/job-positions/:positionId/raci-actors')
  @UseAcl([UserGroup.RW])
  addPositionRaciActor(
    @Param('projectId') projectId: string,
    @Param('positionId') positionId: string,
    @Body() body: { raciActorId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.addPositionRaciActor(
      projectId,
      positionId,
      body.raciActorId ?? '',
      headers,
    );
  }

  @Delete(
    'projects/:projectId/job-positions/:positionId/raci-actors/:mappingId',
  )
  @UseAcl([UserGroup.RW])
  removePositionRaciActor(
    @Param('projectId') projectId: string,
    @Param('positionId') positionId: string,
    @Param('mappingId') mappingId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.removePositionRaciActor(
      projectId,
      positionId,
      mappingId,
      headers,
    );
  }

  @Post('projects/:projectId/job-positions/:positionId/activity-mappings')
  @UseAcl([UserGroup.RW])
  addPositionActivityMapping(
    @Param('projectId') projectId: string,
    @Param('positionId') positionId: string,
    @Body() body: { resourceId?: string; taskId?: string; blockId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.addPositionActivityMapping(
      projectId,
      positionId,
      body,
      headers,
    );
  }

  @Delete(
    'projects/:projectId/job-positions/:positionId/activity-mappings/:mappingId',
  )
  @UseAcl([UserGroup.RW])
  removePositionActivityMapping(
    @Param('projectId') projectId: string,
    @Param('positionId') positionId: string,
    @Param('mappingId') mappingId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.removePositionActivityMapping(
      projectId,
      positionId,
      mappingId,
      headers,
    );
  }

  @Get('projects/:projectId/job-architecture/diagnostics')
  @UseAcl()
  getProjectConsistencyDiagnostics(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.jobArchitecture.getProjectConsistencyDiagnostics(
      projectId,
      headers,
    );
  }
}
