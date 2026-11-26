CREATE TABLE IF NOT EXISTS project_folders (
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "folderId" uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("projectId", "folderId")
);

CREATE INDEX IF NOT EXISTS project_folders_folder_idx
  ON project_folders ("folderId");
