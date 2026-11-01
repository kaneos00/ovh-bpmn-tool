export type RenderTree = {
  id: string;
  name: string;
  type?: string;
  children?: RenderTree[];
  targetId?: string;
  processLifecycleStatus?: import('../../../Types').Resource['processLifecycleStatus'];
};

export * from './FolderTree';
