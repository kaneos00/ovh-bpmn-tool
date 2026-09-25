import type { ResourceType } from '../../../shared/types/BpmnResource';

export type RenderTree = {
  id: string;
  name: string;
  type: ResourceType;
  children?: RenderTree[];
};

export * from './FolderTree';
