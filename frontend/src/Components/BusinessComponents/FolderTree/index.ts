export type RenderTree = {
  id: string;
  name: string;
  type?: string;
  children?: RenderTree[];
};

export * from './FolderTree';
