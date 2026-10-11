-- Project-scoped RACI matrix. Run after 20261011_v2_project_context.sql.
DO $$
BEGIN
  CREATE TYPE project_raci_role_enum AS ENUM ('R', 'A', 'C', 'I');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS project_raci_entries (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "resourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  "taskId" varchar(255) NOT NULL,
  "taskName" varchar(255) NOT NULL,
  "actorName" varchar(255) NOT NULL,
  role project_raci_role_enum NOT NULL,
  CONSTRAINT project_raci_entries_project_process_fk
    FOREIGN KEY ("projectId", "resourceId")
    REFERENCES project_processes ("projectId", "resourceId")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS project_raci_entries_unique_assignment
  ON project_raci_entries ("projectId", "resourceId", "taskId", "actorName");

CREATE INDEX IF NOT EXISTS project_raci_entries_project_process_idx
  ON project_raci_entries ("projectId", "resourceId");
