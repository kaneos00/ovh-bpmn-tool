import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../shared-kernel/utils/UserGroup';
import { OrganizationStructureService } from '../../organizationStructure.service';

type RequestHeaders = Record<string, string | undefined>;

@Controller('organization')
export class OrganizationStructureController {
  constructor(private readonly organization: OrganizationStructureService) {}

  @Get('positions')
  @UseAcl([UserGroup.Admin])
  listPositions(@Query('includeInactive') includeInactive?: string) {
    return this.organization.listPositions(includeInactive === 'true');
  }

  @Get('positions/tree')
  @UseAcl([UserGroup.Admin])
  getTree(@Query('includeInactive') includeInactive?: string) {
    return this.organization.getTree(includeInactive === 'true');
  }

  @Post('positions')
  @UseAcl([UserGroup.Admin])
  createPosition(
    @Body() body: {
      title?: string;
      description?: string | null;
      functionId?: string | null;
      parentPositionId?: string | null;
      sortOrder?: number;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.organization.createPosition(body, headers);
  }

  @Patch('positions/:positionId')
  @UseAcl([UserGroup.Admin])
  updatePosition(
    @Param('positionId') positionId: string,
    @Body() body: {
      title?: string;
      description?: string | null;
      functionId?: string | null;
      parentPositionId?: string | null;
      sortOrder?: number;
    },
  ) {
    return this.organization.updatePosition(positionId, body);
  }

  @Patch('positions/:positionId/status')
  @UseAcl([UserGroup.Admin])
  setPositionActive(
    @Param('positionId') positionId: string,
    @Body() body: { active?: boolean },
  ) {
    if (typeof body.active !== 'boolean') {
      throw new BadRequestException('active must be a boolean');
    }
    return this.organization.setPositionActive(positionId, body.active);
  }
}
