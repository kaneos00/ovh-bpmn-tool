import { Nullable } from '../../../../shared-kernel/utils/Nullable';
import { ContentStatusEnum } from '../../../../modules/ResourceContext/shared/types/Content';

export class ContentPresenter {
  id: string;
  resourceId: string;
  content: string;
  changeComment: Nullable<string>;
  status: ContentStatusEnum;
  version: Nullable<number>;
  createdBy: string;
  createdAt: string;
  updatedBy: Nullable<string>;
  updatedAt: Nullable<string>;
}
