import {
  Body,
  Controller,
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
}
