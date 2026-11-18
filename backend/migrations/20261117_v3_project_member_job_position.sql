-- One organisational position per project member.
-- Assignment belongs to the JobArchitecture bounded context and references
-- ProjectContext membership without changing its source table.
CREATE TABLE IF NOT EXISTS project_member_job_positions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "projectId" uuid NOT NULL,
  "userId" varchar(255) NOT NULL,
  "positionId" uuid NOT NULL,
  CONSTRAINT project_member_job_positions_member_fk
    FOREIGN KEY ("projectId", "userId")
    REFERENCES project_members ("projectId", "userId") ON DELETE CASCADE,
  CONSTRAINT project_member_job_positions_position_fk
    FOREIGN KEY ("projectId", "positionId")
    REFERENCES project_job_positions ("projectId", id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS project_member_job_positions_member_unique
  ON project_member_job_positions ("projectId", "userId");
CREATE INDEX IF NOT EXISTS project_member_job_positions_position_idx
  ON project_member_job_positions ("projectId", "positionId");
