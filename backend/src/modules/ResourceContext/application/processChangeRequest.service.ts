import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProcessChangeRequestTypeOrmEntity } from '../infrastructure/entities/processChangeRequest.ormEntity';
import { ProcessChangeRequestEventTypeOrmEntity } from '../infrastructure/entities/processChangeRequestEvent.ormEntity';
import { ContentTypeOrmEntity } from '../infrastructure/entities/content.ormEntity';
import { ContentStatusEnum } from '../shared/types/Content';
import {
  ProcessChangeRequestStatusEnum as Status,
  ProcessChangeRequestTypeEnum as RequestType,
} from '../shared/types/ProcessChangeRequest';
import { assertProcessChangeRequestTransition } from '../domain/ProcessChangeRequest/ProcessChangeRequestWorkflow';

@Injectable()
export class ProcessChangeRequestService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createProposal(params: {
    resourceId: string;
    authorId: string;
    title: string;
    description: string;
    justification?: string;
  }) {
    const title = params.title.trim();
    const description = params.description.trim();
    if (!title || !description) {
      throw new BadRequestException('Un titre et une description sont requis');
    }

    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(ProcessChangeRequestTypeOrmEntity);
      const events = manager.getRepository(
        ProcessChangeRequestEventTypeOrmEntity,
      );
      const request = requests.create({
        resourceId: params.resourceId,
        authorId: params.authorId,
        type: RequestType.Proposal,
        status: Status.Proposed,
        title,
        description,
        justification: params.justification?.trim() || null,
        sourceContentId: null,
        sourceVersion: null,
        workingContentId: null,
        assignedReviewerId: null,
        submittedAt: null,
        reviewedAt: null,
        decidedAt: null,
        publishedContentId: null,
        createdBy: params.authorId,
      });
      const saved = await requests.save(request);
      await events.save(events.create({
        requestId: saved.id,
        actorId: params.authorId,
        event: 'created',
        fromStatus: null,
        toStatus: Status.Proposed,
        comment: null,
        metadata: { type: RequestType.Proposal },
      }));
      return saved;
    });
  }

  async attachWorkingContent(params: {
    resourceId: string;
    requestId: string;
    authorId: string;
    sourceContentId: string;
    sourceVersion: number;
    workingContentId: string;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(ProcessChangeRequestTypeOrmEntity);
      const events = manager.getRepository(
        ProcessChangeRequestEventTypeOrmEntity,
      );
      const request = await requests.findOne({
        where: { id: params.requestId, resourceId: params.resourceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request || request.authorId !== params.authorId) {
        throw new NotFoundException('Demande introuvable ou non détenue par l’auteur');
      }
      if (request.type !== RequestType.Proposal || request.status !== Status.Proposed) {
        throw new BadRequestException('Solo una proposta non ancora avviata può diventare una modifica');
      }
      request.type = RequestType.ContentChange;
      request.status = Status.Draft;
      request.sourceContentId = params.sourceContentId;
      request.sourceVersion = params.sourceVersion;
      request.workingContentId = params.workingContentId;
      const saved = await requests.save(request);
      await events.save(events.create({
        requestId: saved.id,
        actorId: params.authorId,
        event: 'commented',
        fromStatus: Status.Proposed,
        toStatus: Status.Draft,
        comment: null,
        metadata: {
          type: RequestType.ContentChange,
          sourceContentId: params.sourceContentId,
          workingContentId: params.workingContentId,
        },
      }));
      return saved;
    });
  }

  async list(resourceId: string) {
    return this.dataSource.getRepository(ProcessChangeRequestTypeOrmEntity).find({
      where: { resourceId },
      order: { createdAt: 'DESC' },
    });
  }

  async transition(params: {
    resourceId: string;
    requestId: string;
    actorId: string;
    nextStatus: Status;
    comment?: string;
    allowSelfApproval?: boolean;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(ProcessChangeRequestTypeOrmEntity);
      const events = manager.getRepository(
        ProcessChangeRequestEventTypeOrmEntity,
      );
      const request = await requests.findOne({
        where: { id: params.requestId, resourceId: params.resourceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) throw new NotFoundException('Demande introuvable');

      if (
        [Status.Withdrawn, Status.Draft].includes(params.nextStatus) &&
        request.authorId !== params.actorId
      ) {
        throw new BadRequestException('Seul l’auteur peut modifier ou retirer sa demande');
      }
      if (params.nextStatus === Status.InReview && request.type === RequestType.ContentChange) {
        if (!request.workingContentId || !request.sourceContentId) {
          throw new BadRequestException('La contribution BPMN doit être créée avant la soumission');
        }
        const contents = manager.getRepository(ContentTypeOrmEntity);
        const working = await contents.findOne({
          where: { id: request.workingContentId, resourceId: params.resourceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!working || working.status !== ContentStatusEnum.Draft) {
          throw new BadRequestException('La version de travail n’est plus une bozza modificabile');
        }
        const latestPublished = await contents.findOne({
          where: { resourceId: params.resourceId, status: ContentStatusEnum.Published },
          order: { version: 'DESC' },
        });
        if (!latestPublished || latestPublished.id !== request.sourceContentId) {
          throw new ConflictException('La versione pubblicata è cambiata: aggiorna la bozza prima di sottoporla');
        }
      }

      assertProcessChangeRequestTransition(
        { status: request.status, authorId: request.authorId },
        params.nextStatus,
        params.actorId,
        params.allowSelfApproval ?? false,
      );

      if (
        [Status.ChangesRequested, Status.Approved, Status.Rejected].includes(
          params.nextStatus,
        ) &&
        !params.comment?.trim() &&
        params.nextStatus !== Status.Approved
      ) {
        throw new BadRequestException('Un commentaire est requis pour cette décision');
      }

      const previousStatus = request.status;
      request.status = params.nextStatus;
      if (params.nextStatus === Status.InReview) request.submittedAt = new Date();
      if (params.nextStatus === Status.ChangesRequested) request.reviewedAt = new Date();
      if ([Status.Approved, Status.Rejected].includes(params.nextStatus)) {
        request.decidedAt = new Date();
      }
      const saved = await requests.save(request);
      const eventName =
        params.nextStatus === Status.InReview
          ? 'submitted'
          : params.nextStatus === Status.ChangesRequested
            ? 'changes_requested'
            : params.nextStatus === Status.Draft
              ? 'commented'
              : params.nextStatus;
      await events.save(events.create({
        requestId: saved.id,
        actorId: params.actorId,
        event: eventName,
        fromStatus: previousStatus,
        toStatus: params.nextStatus,
        comment: params.comment?.trim() || null,
        metadata: {},
      }));
      return saved;
    });
  }

  /**
   * A submitted or approved working copy is immutable through the generic
   * content editor. It can only be changed again after the reviewer requests
   * corrections and the author returns the request to Draft.
   */
  async assertContentCanBeEdited(resourceId: string, contentId: string) {
    const request = await this.dataSource
      .getRepository(ProcessChangeRequestTypeOrmEntity)
      .findOne({
        where: [
          { resourceId, workingContentId: contentId, status: Status.InReview },
          { resourceId, workingContentId: contentId, status: Status.Approved },
        ],
        select: { id: true, status: true },
      });
    if (request) {
      throw new ConflictException(
        'La versione BPMN è bloccata perché la richiesta è in revisione o approvata',
      );
    }
  }

  /**
   * Generic publication must not bypass the request workflow. A working copy
   * linked to a change request will require the dedicated approved-publication
   * operation, which records the Published transition and its audit event.
   */
  async assertGenericPublicationAllowed(resourceId: string, contentId: string) {
    const request = await this.dataSource
      .getRepository(ProcessChangeRequestTypeOrmEntity)
      .findOne({
        where: { resourceId, workingContentId: contentId },
        select: { id: true, status: true },
      });
    if (request) {
      throw new ConflictException(
        'Questa versione BPMN è collegata a una richiesta: pubblicala tramite il workflow di validazione',
      );
    }
  }

  async getEvents(resourceId: string, requestId: string) {
    const request = await this.dataSource
      .getRepository(ProcessChangeRequestTypeOrmEntity)
      .findOne({ where: { id: requestId, resourceId }, select: { id: true } });
    if (!request) throw new NotFoundException('Demande introuvable');
    return this.dataSource
      .getRepository(ProcessChangeRequestEventTypeOrmEntity)
      .find({ where: { requestId }, order: { createdAt: 'ASC' } });
  }
}
