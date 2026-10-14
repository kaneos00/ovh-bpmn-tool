export type CompareRouteParams = {
  resourceId?: string;
  leftResourceId?: string;
  rightResourceId?: string;
  leftContentId: string;
  rightContentId: string;
};

export * from './ContentCompare.container';
