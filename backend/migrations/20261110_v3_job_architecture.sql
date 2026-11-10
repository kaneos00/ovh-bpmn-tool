-- Autonomous job-function and project-position module.
-- Additive only: existing project, BPMN and RACI tables are read/reference sources.

CREATE TABLE IF NOT EXISTS job_functions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  code varchar(64) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS job_functions_code_unique ON job_functions (code);

CREATE TABLE IF NOT EXISTS competency_blocks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  code varchar(64) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS competency_blocks_code_unique ON competency_blocks (code);

CREATE TABLE IF NOT EXISTS competencies (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "blockId" uuid NOT NULL REFERENCES competency_blocks(id) ON DELETE CASCADE,
  code varchar(64) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  "referenceLevel" smallint,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT competencies_reference_level_check CHECK ("referenceLevel" IS NULL OR "referenceLevel" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS competencies_block_code_unique ON competencies ("blockId", code);

CREATE TABLE IF NOT EXISTS job_function_competency_blocks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "functionId" uuid NOT NULL REFERENCES job_functions(id) ON DELETE CASCADE,
  "blockId" uuid NOT NULL REFERENCES competency_blocks(id) ON DELETE RESTRICT,
  "sortOrder" integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS job_function_competency_blocks_unique
  ON job_function_competency_blocks ("functionId", "blockId");

CREATE TABLE IF NOT EXISTS project_job_positions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "functionId" uuid NOT NULL REFERENCES job_functions(id) ON DELETE RESTRICT,
  title varchar(255) NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS project_job_positions_project_idx ON project_job_positions ("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS project_job_positions_project_title_unique
  ON project_job_positions ("projectId", lower(title));
-- Composite key lets child mappings enforce that their position belongs to the same project.
CREATE UNIQUE INDEX IF NOT EXISTS project_job_positions_project_id_unique
  ON project_job_positions ("projectId", id);

CREATE TABLE IF NOT EXISTS position_competency_blocks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "positionId" uuid NOT NULL REFERENCES project_job_positions(id) ON DELETE CASCADE,
  "blockId" uuid NOT NULL REFERENCES competency_blocks(id) ON DELETE RESTRICT,
  applicability varchar(20) NOT NULL DEFAULT 'not_assessed',
  "requiredLevel" smallint,
  CONSTRAINT position_competency_blocks_applicability_check
    CHECK (applicability IN ('required', 'optional', 'not_applicable', 'not_assessed')),
  CONSTRAINT position_competency_blocks_level_check
    CHECK ("requiredLevel" IS NULL OR "requiredLevel" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS position_competency_blocks_unique
  ON position_competency_blocks ("positionId", "blockId");

CREATE TABLE IF NOT EXISTS position_raci_actor_mappings (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "projectId" uuid NOT NULL,
  "positionId" uuid NOT NULL,
  "raciActorId" uuid NOT NULL REFERENCES project_raci_actors(id) ON DELETE RESTRICT,
  CONSTRAINT position_raci_actor_mappings_position_fk
    FOREIGN KEY ("projectId", "positionId")
    REFERENCES project_job_positions ("projectId", id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS position_raci_actor_mappings_unique
  ON position_raci_actor_mappings ("positionId", "raciActorId");

CREATE TABLE IF NOT EXISTS position_activity_mappings (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "projectId" uuid NOT NULL,
  "positionId" uuid NOT NULL,
  "resourceId" uuid NOT NULL,
  "taskId" varchar(255) NOT NULL,
  "blockId" uuid NOT NULL REFERENCES competency_blocks(id) ON DELETE RESTRICT,
  CONSTRAINT position_activity_mappings_position_fk
    FOREIGN KEY ("projectId", "positionId")
    REFERENCES project_job_positions ("projectId", id) ON DELETE CASCADE,
  CONSTRAINT position_activity_mappings_project_process_fk
    FOREIGN KEY ("projectId", "resourceId")
    REFERENCES project_processes ("projectId", "resourceId") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS position_activity_mappings_unique
  ON position_activity_mappings ("positionId", "resourceId", "taskId", "blockId");
CREATE INDEX IF NOT EXISTS position_activity_mappings_project_process_idx
  ON position_activity_mappings ("projectId", "resourceId");
