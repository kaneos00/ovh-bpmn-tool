import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ProjectResourceAccessService } from '../../../ProjectContext/projectResourceAccess.service';
import { ProcessChangeRequestService } from '../../application/processChangeRequest.service';
import { ProcessChangeRequestStatusEnum as Status } from '../../shared/types/ProcessChangeRequest';
import { CloneContentCommandHandler } from '../../application/commands/Content/cloneContent/cloneContent.commandHandler';
import { ListContentQueryHandler } from '../../application/queries/Content/listContent/listContent.queryHandler';
import { ContentStatusEnum } from '../../shared/types/Content';

type ProposalBody = {
  title: string;
  description: string;
  justification?: string;
};

type TransitionBody = {
  comment?: string;
};

type ReviewerAssignmentBody = {
  reviewerId: string;
};

@Controller('resources/:resourceId/change-requests')
@UseAcl([UserGroup.RW, UserGroup.Admin])
export class ProcessChangeRequestController {
  constructor(
    private readonly projectResourceAccess: ProjectResourceAccessService,
    private readonly requests: ProcessChangeRequestService,
    private readonly cloneContent: CloneContentCommandHandler,
    private readonly listContents: ListContentQueryHandler,
  ) {}

  @Post()
  async createProposal(
    @Param('resourceId') resourceId: string,
    @Body() body: ProposalBody = { title: '', description: '' },
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

  @Post(':requestId/start-editing')
  async startEditing(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Body() body: ProposalBody = { title: '', description: '' },
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(
      resourceId,
      headers,
      { allowCommonForOrganizationAdmin: true },
    );
    const authorId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const request = (await this.requests.list(resourceId)).find(
      (item) => item.id === requestId,
    );
    if (!request || request.authorId !== authorId) {
      throw new BadRequestException(
        'Demande introuvable ou non détenue par l’auteur',
      );
    }
    if (request.workingContentId) {
      throw new BadRequestException(
        'La demande possède déjà une version de travail',
      );
    }
    const contentsResult = await this.listContents.execute(resourceId, {
      filters: { status: ContentStatusEnum.Published },
    });
    if (contentsResult.fail || !contentsResult.ok.length) {
      throw new BadRequestException('Aucune version publiée disponible');
    }
    const source = [...contentsResult.ok].sort(
      (a, b) => (b.state.version ?? 0) - (a.state.version ?? 0),
    )[0];
    const cloneResult = await this.cloneContent.execute(
      resourceId,
      source.id.value,
      {
        clonedBy: authorId,
        changeComment: body.description || request.description,
      },
    );
    if (cloneResult.fail) {
      throw new BadRequestException(cloneResult.fail.message);
    }
    return this.requests.attachWorkingContent({
      resourceId,
      requestId,
      authorId,
      sourceContentId: source.id.value,
      sourceVersion: source.state.version ?? 1,
      workingContentId: cloneResult.ok.id.value,
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

  @Post(':requestId/assign-reviewer')
  async assignReviewer(
    @Param('resourceId') resourceId: string,
    @Param('requestId') requestId: string,
    @Body() body: ReviewerAssignmentBody,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(
      resourceId,
      headers,
    );
    return this.requests.assignReviewer({
      resourceId,
      requestId,
      actorId: this.projectResourceAccess.getAuthenticatedUserId(headers),
      reviewerId: body.reviewerId ?? '',
    });
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
    @Body() body: TransitionBody = {},
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
