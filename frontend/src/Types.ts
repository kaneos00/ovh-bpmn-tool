import { ResourceType } from './shared/types/BpmnResource';
import { Nullable } from './shared/types/Nullable';

export enum ContentStatusEnum {
  Obsolete = 'obsolete',
  Draft = 'draft',
  Published = 'published',
}

export type Resource = {
  id: string;
  name: string;
  depth: number;
  description: string;
  parentId?: string;
  sourceResourceId?: string | null;
  type: ResourceType;
  authToken?: string;
  processLifecycleStatus?:
    | 'unpublished'
    | 'published'
    | 'modification_in_preparation'
    | 'in_validation'
    | 'changes_requested'
    | 'validation_granted';
};

export type Comment = {
  id: string;
  resourceId: string;
  comment: string;
  createdBy: string;
  createdAt: string;
};

export type Content = {
  id: string;
  resourceId: string;
  version: Nullable<number>;
  changeComment?: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  status: ContentStatusEnum;
};
