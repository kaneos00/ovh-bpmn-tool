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
import { UseAcl } from '../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../shared-kernel/utils/UserGroup';
import { OrganizationService } from '../organization.service';

type RequestHeaders = Record<string, string | undefined>;

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Get('me/workspace')
  @UseAcl()
  getMyWorkspace(@Headers() headers: RequestHeaders) {
    return this.organization.getMyWorkspace(headers);
  }

  @Get('overview')
  @UseAcl()
  getOverview() {
    return this.organization.getOverview();
  }

  @Get('positions')
  @UseAcl()
  listPositions() {
    return this.organization.listPositions();
  }

  @Post('positions')
  @UseAcl([UserGroup.Admin])
  createPosition(
    @Body() body: { code?: unknown; title?: unknown; description?: unknown; functionId?: unknown },
    @Headers() headers: RequestHeaders,
  ) {
    return this.organization.createPosition(body, headers);
  }

  @Get('positions/:positionId')
  @UseAcl()
  getPosition(@Param('positionId') positionId: string) {
    return this.organization.getPosition(positionId);
  }

  @Patch('positions/:positionId')
  @UseAcl([UserGroup.Admin])
  updatePosition(
    @Param('positionId') positionId: string,
    @Body() body: { code?: unknown; title?: unknown; description?: unknown; functionId?: unknown; active?: unknown },
  ) {
    return this.organization.updatePosition(positionId, body);
  }

  @Post('positions/:positionId/assignments')
  @UseAcl([UserGroup.Admin])
  createAssignment(
    @Param('positionId') positionId: string,
    @Body() body: { userId?: unknown; startDate?: unknown; endDate?: unknown; note?: unknown },
    @Headers() headers: RequestHeaders,
  ) {
    return this.organization.createAssignment(positionId, body, headers);
  }

  @Patch('assignments/:assignmentId')
  @UseAcl([UserGroup.Admin])
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() body: { endDate?: unknown },
  ) {
    return this.organization.updateAssignment(assignmentId, body);
  }

  @Post('positions/:positionId/relations')
  @UseAcl([UserGroup.Admin])
  addRelation(
    @Param('positionId') positionId: string,
    @Body() body: { childPositionId?: unknown; sortOrder?: unknown },
    @Headers() headers: RequestHeaders,
  ) {
    return this.organization.addRelation(positionId, body, headers);
  }

  @Delete('positions/:positionId/relations/:relationId')
  @UseAcl([UserGroup.Admin])
  removeRelation(
    @Param('positionId') positionId: string,
    @Param('relationId') relationId: string,
  ) {
    return this.organization.removeRelation(positionId, relationId);
  }
}
