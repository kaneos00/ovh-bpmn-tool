import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ProjectResourceAccessService } from '../../../ProjectContext/projectResourceAccess.service';
import { ProcessChangeRequestService } from '../../application/processChangeRequest.service';
import { ProcessChangeRequestStatusEnum as Status } from '../../shared/types/ProcessChangeRequest';

type ProposalBody = {
  title: string;
  description: string;
  justification?: string;
};

type TransitionBody = {
  comment?: string;
};

@Controller('resources/:resourceId/change-requests')
@UseAcl([UserGroup.RW, UserGroup.Admin])
export class ProcessChangeRequestController {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectResourceAccess: ProjectResourceAccessService,
    private readonly requests: ProcessChangeRequestService,
  ) {}

  @Post()
  async createProposal(
    @Param('resourceId') resourceId: string,
    @Body() body: ProposalBody,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanReadResource(resourceId, headers);
    return this.requests.createProposal({
      resourceId,
      authorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      title: body.title ?? '',
      description: body.description ?? '',
      justification: body.justification,
    });
  }

  @Get()
  async list(
    @Param('resourceId') resourceId: string,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanReadResource(resourceId, headers);
    return this.requests.list(resourceId);
  }

  @Get(':requestId/events')
  async getEvents(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanReadResource(resourceId, headers);
    return this.requests.getEvents(resourceId, requestId);
  }

  @Post(':requestId/submit')
  async submit(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(resourceId, headers);
    return this.requests.transition({
      resourceId,
      requestId,
      actorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      nextStatus: Status.InReview,
    });
  }

  @Post(':requestId/request-changes')
  async requestChanges(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Body() body: TransitionBody,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(resourceId, headers);
    if (!body.comment?.trim()) {
      throw new BadRequestException('Un commentaire est requis');
    }
    return this.requests.transition({
      resourceId,
      requestId,
      actorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      nextStatus: Status.ChangesRequested,
      comment: body.comment,
    });
  }

  @Post(':requestId/approve')
  async approve(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Body() body: TransitionBody,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(resourceId, headers);
    return this.requests.transition({
      resourceId,
      requestId,
      actorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      nextStatus: Status.Approved,
      comment: body.comment,
    });
  }

  @Post(':requestId/reject')
  async reject(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Body() body: TransitionBody,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(resourceId, headers);
    if (!body.comment?.trim()) {
      throw new BadRequestException('Un motif de refus est requis');
    }
    return this.requests.transition({
      resourceId,
      requestId,
      actorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      nextStatus: Status.Rejected,
      comment: body.comment,
    });
  }

  @Post(':requestId/withdraw')
  async withdraw(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanReadResource(resourceId, headers);
    return this.requests.transition({
      resourceId,
      requestId,
      actorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      nextStatus: Status.Withdrawn,
    });
  }
}
