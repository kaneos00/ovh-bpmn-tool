export type RenderTree = {
  id: string;
  name: string;
  type?: string;
  children?: RenderTree[];
  targetId?: string;
  usage?: 'common' | 'variant' | 'project-specific';
  nature?: 'global' | 'specific' | string;
  sourceResourceId?: string | null;
  remarksCount?: number;
  changeRequestsCount?: number;
};

export * from './FolderTree';
