export type RenderTree = {
  id: string;
  name: string;
  type?: string;
  children?: RenderTree[];
  targetId?: string;
  usage?: 'common' | 'variant' | 'project-specific';
  sourceResourceId?: string | null;
};

export * from './FolderTree';
