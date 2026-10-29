export type UpdateContentCommandParams = {
  resourceId: string;
  contentId: string;
};

export type UpdateContentCommand = {
  content?: string;
  changeComment?: string | null;
  updatedBy: string;
};
