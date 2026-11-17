import { ResourceType } from '../../shared/types/BpmnResource';

export type AddResourceParams = {
  resourceId: string;
};

export type AddResourceLoader = {
  type: ResourceType;
  projectId?: string;
};

export * from './AddResource.loader';
export * from './AddResource.action';
export * from './AddResource.container';
