import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentStatusEnum } from './shared/types/Content';
import { ContentTypeOrmEntity } from './infrastructure/entities/content.ormEntity';
import { ProjectResourceAccessService } from '../ProjectContext/projectResourceAccess.service';

export type ResourceContentGovernanceHeaders = Record<string, string | undefined>;

export interface ResourceContentGovernanceSnapshot {
  resourceId: string;
  contentId: string;
  status: ContentStatusEnum;
  version: number | null;
  content: string;
  changeComment: string | null;
  updatedAt: Date;
}

/**
 * Narrow read-only content contract for governance consumers.
 *
 * It deliberately exposes no draft creation, XML update or publication
 * operation. Those writes remain blocked until ProjectContext and
 * ResourceContext can participate in one shared transaction.
 */
@Injectable()
export class ResourceContentGovernanceService {
  constructor(
    private readonly access: ProjectResourceAccessService,
    @InjectRepository(ContentTypeOrmEntity)
    private readonly contents: Repository<ContentTypeOrmEntity>,
  ) {}

  async readContentSnapshot(
    resourceId: string,
    contentId: string,
    headers: ResourceContentGovernanceHeaders,
  ): Promise<ResourceContentGovernanceSnapshot> {
    await this.access.assertCanReadResource(resourceId, headers);

    const content = await this.contents.findOne({
      where: { id: contentId, resourceId },
      select: {
        id: true,
        resourceId: true,
        status: true,
        version: true,
        content: true,
        changeComment: true,
        updatedAt: true,
      },
    });
    if (!content) {
      throw new NotFoundException(
        'The selected content does not belong to the requested resource',
      );
    }

    return {
      resourceId: content.resourceId,
      contentId: content.id,
      status: content.status,
      version: content.version,
      content: content.content,
      changeComment: content.changeComment,
      updatedAt: content.updatedAt,
    };
  }
}
