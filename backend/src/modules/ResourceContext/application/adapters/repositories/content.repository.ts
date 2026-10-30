import { Result } from '../../../../../shared-kernel/utils/Result';
import { Content } from '../../../../../modules/ResourceContext/domain/Content/Content';
import { ContentStatusEnum } from '../../../../../modules/ResourceContext/shared/types/Content';

import type { Maybe } from '../../../../../shared-kernel/utils/Maybe';
import { SortCommand } from '../../../../../shared-kernel/utils/SortCommand';

export type ContentFilters = {
  status?: ContentStatusEnum;
};

export type ExplorerProcessLinks = {
  resourceId: string;
  processIds: string[];
  targets: string[];
};

export interface ContentRepository {
  save(content: Content): Promise<Result<Content, Error>>;
  delete(contentId: string): Promise<Result<boolean, Error>>;

  findOne(contentId: string): Promise<Result<Content, Error>>;
  findOneBy(filters: {
    resourceId: string;
    status: ContentStatusEnum;
  }): Promise<Result<Maybe<Content>, Error>>;
  findExplorerProcessLinks(
    resourceIds: string[],
  ): Promise<Result<ExplorerProcessLinks[], Error>>;
  find(
    contentId: string,
    filters?: ContentFilters,
    sort?: SortCommand,
  ): Promise<Result<Content[], Error | Error[]>>;
}
