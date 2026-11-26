-- V0.10 destructive replacement of the competency model.
--
-- THIS FILE IS INTENTIONALLY GUARDED.
-- It is only for an explicitly identified test database. It deletes all
-- existing competency definitions and individual project requirements.
--
-- The caller MUST pass both psql variables:
--   -v allow_destructive_competency_reset=true
--   -v expected_database=<exact PostgreSQL database name>
--
-- The caller is responsible for a verified external backup before execution.
-- This migration deliberately does NOT delete project blocks, block
-- applicability, BPMN activity mappings, RACI mappings, functions or positions.

\set ON_ERROR_STOP on

SELECT set_config(
  'app.allow_destructive_competency_reset',
  :'allow_destructive_competency_reset',
  false
);
SELECT set_config(
  'app.expected_competency_reset_database',
  :'expected_database',
  false
);

BEGIN;

DO $guard$
DECLARE
  expected_database text;
BEGIN
  expected_database := current_setting('app.expected_competency_reset_database', true);

  IF current_setting('app.allow_destructive_competency_reset', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Destructive competency reset refused: explicit acknowledgement is required';
  END IF;

  IF expected_database IS NULL OR expected_database = '' OR expected_database <> current_database() THEN
    RAISE EXCEPTION 'Destructive competency reset refused: expected database does not match current_database()';
  END IF;

  IF current_database() IN ('postgres', 'template0', 'template1') THEN
    RAISE EXCEPTION 'Destructive competency reset refused on a system database';
  END IF;

  IF to_regclass('public.competencies') IS NULL
     OR to_regclass('public.competency_blocks') IS NULL
     OR to_regclass('public.position_competency_requirements') IS NULL
     OR to_regclass('public.job_functions') IS NULL THEN
    RAISE EXCEPTION 'Destructive competency reset refused: expected V0.10 source tables are missing';
  END IF;

  -- Fail closed if an unreviewed table also references the competency table.
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_catalog = ccu.constraint_catalog
     AND tc.constraint_schema = ccu.constraint_schema
     AND tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'competencies'
      AND tc.table_name <> 'position_competency_requirements'
  ) THEN
    RAISE EXCEPTION 'Destructive competency reset refused: an unreviewed foreign-key consumer references competencies';
  END IF;
END;
$guard$;

-- Test data only: remove individual competency requirements. Project block
-- applicability and its requiredLevel are intentionally retained.
DELETE FROM position_competency_requirements;

ALTER TABLE position_competency_requirements
  DROP CONSTRAINT IF EXISTS position_competency_requirements_competency_fk,
  DROP CONSTRAINT IF EXISTS position_competency_requirements_level_check;

DROP INDEX IF EXISTS position_competency_requirements_unique;

-- Remove old competency definitions; IDs and block-specific codes are not
-- preserved because this is an explicitly authorized test-data reset.
DELETE FROM competencies;

ALTER TABLE competencies
  DROP CONSTRAINT IF EXISTS competencies_reference_level_check,
  DROP CONSTRAINT IF EXISTS competencies_category_check,
  DROP CONSTRAINT IF EXISTS "competencies_blockId_fkey";

DROP INDEX IF EXISTS competencies_block_code_unique;
DROP INDEX IF EXISTS competencies_block_id_unique;

ALTER TABLE competencies
  DROP COLUMN "blockId",
  DROP COLUMN "referenceLevel";

ALTER TABLE competencies
  ALTER COLUMN category DROP DEFAULT,
  ALTER COLUMN category SET NOT NULL,
  ADD CONSTRAINT competencies_category_check
    CHECK (category IN ('methodological', 'technical', 'functional', 'behavioral'));

CREATE UNIQUE INDEX competencies_code_unique ON competencies (code);

-- One global competency can be associated with multiple project competency
-- blocks. Removing a link cannot delete the global competency.
CREATE TABLE competency_block_competencies (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "blockId" uuid NOT NULL REFERENCES competency_blocks(id) ON DELETE CASCADE,
  "competencyId" uuid NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  "sortOrder" integer NOT NULL DEFAULT 0,
  CONSTRAINT competency_block_competencies_sort_check CHECK ("sortOrder" >= 0),
  CONSTRAINT competency_block_competencies_block_competency_unique
    UNIQUE ("blockId", "competencyId")
);
CREATE INDEX competency_block_competencies_competency_idx
  ON competency_block_competencies ("competencyId");

-- Individual project requirements are recreated later from the new catalogue.
-- Keep project-position blocks and their separate block-level requiredLevel.
ALTER TABLE position_competency_requirements
  ADD CONSTRAINT position_competency_requirements_competency_fk
    FOREIGN KEY ("blockId", "competencyId")
    REFERENCES competency_block_competencies ("blockId", "competencyId")
    ON DELETE RESTRICT,
  ADD CONSTRAINT position_competency_requirements_level_check
    CHECK ("requiredLevel" IS NULL OR "requiredLevel" BETWEEN 1 AND 5);

CREATE UNIQUE INDEX position_competency_requirements_unique
  ON position_competency_requirements ("positionId", "blockId", "competencyId");

-- Canonical four mission blocks belong to JobFunction, already referenced by
-- OrganizationPosition.functionId. They are distinct from competency_blocks.
CREATE TABLE job_function_mission_blocks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "functionId" uuid NOT NULL REFERENCES job_functions(id) ON DELETE CASCADE,
  code varchar(64) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  "sortOrder" integer NOT NULL,
  CONSTRAINT job_function_mission_blocks_sort_check CHECK ("sortOrder" BETWEEN 1 AND 4),
  CONSTRAINT job_function_mission_blocks_function_code_unique UNIQUE ("functionId", code),
  CONSTRAINT job_function_mission_blocks_function_order_unique UNIQUE ("functionId", "sortOrder")
);

CREATE TABLE job_function_mission_activities (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "missionBlockId" uuid NOT NULL REFERENCES job_function_mission_blocks(id) ON DELETE CASCADE,
  description text NOT NULL,
  "sortOrder" integer NOT NULL,
  CONSTRAINT job_function_mission_activities_sort_check CHECK ("sortOrder" BETWEEN 1 AND 4),
  CONSTRAINT job_function_mission_activities_block_order_unique UNIQUE ("missionBlockId", "sortOrder")
);

CREATE TABLE job_function_mission_competencies (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "missionBlockId" uuid NOT NULL REFERENCES job_function_mission_blocks(id) ON DELETE CASCADE,
  "competencyId" uuid NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  "requiredLevel" smallint NOT NULL,
  "sortOrder" integer NOT NULL DEFAULT 0,
  CONSTRAINT job_function_mission_competencies_level_check CHECK ("requiredLevel" BETWEEN 1 AND 5),
  CONSTRAINT job_function_mission_competencies_sort_check CHECK ("sortOrder" >= 0),
  CONSTRAINT job_function_mission_competencies_block_competency_unique
    UNIQUE ("missionBlockId", "competencyId")
);

CREATE TABLE job_function_transversal_competencies (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "functionId" uuid NOT NULL REFERENCES job_functions(id) ON DELETE CASCADE,
  "competencyId" uuid NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  "requiredLevel" smallint NOT NULL,
  "sortOrder" integer NOT NULL DEFAULT 0,
  CONSTRAINT job_function_transversal_competencies_level_check CHECK ("requiredLevel" BETWEEN 1 AND 5),
  CONSTRAINT job_function_transversal_competencies_sort_check CHECK ("sortOrder" >= 0),
  CONSTRAINT job_function_transversal_competencies_function_competency_unique
    UNIQUE ("functionId", "competencyId")
);

CREATE INDEX job_function_mission_blocks_function_order_idx
  ON job_function_mission_blocks ("functionId", "sortOrder");
CREATE INDEX job_function_mission_activities_block_order_idx
  ON job_function_mission_activities ("missionBlockId", "sortOrder");
CREATE INDEX job_function_mission_competencies_competency_idx
  ON job_function_mission_competencies ("competencyId");
CREATE INDEX job_function_transversal_competencies_competency_idx
  ON job_function_transversal_competencies ("competencyId");

-- Verify that protected project/BPMN/RACI structures remain present.
DO $postcheck$
BEGIN
  IF to_regclass('public.competency_blocks') IS NULL
     OR to_regclass('public.job_function_competency_blocks') IS NULL
     OR to_regclass('public.position_competency_blocks') IS NULL
     OR to_regclass('public.position_activity_mappings') IS NULL
     OR to_regclass('public.position_raci_actor_mappings') IS NULL THEN
    RAISE EXCEPTION 'Competency reset post-check failed: a protected project/BPMN/RACI table is missing';
  END IF;
END;
$postcheck$;

COMMIT;
