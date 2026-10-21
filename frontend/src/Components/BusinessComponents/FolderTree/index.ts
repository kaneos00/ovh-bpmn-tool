export type RenderTree = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  children?: RenderTree[];
  targetId?: string;
};

export * from './FolderTree';
