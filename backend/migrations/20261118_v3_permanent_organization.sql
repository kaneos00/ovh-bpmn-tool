-- Permanent organization structure. Additive: project RACI and BPMN source tables remain untouched.

CREATE TABLE IF NOT EXISTS organization_positions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  code varchar(64) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  "functionId" uuid REFERENCES job_functions(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_positions_code_unique
  ON organization_positions (code);
CREATE INDEX IF NOT EXISTS organization_positions_active_title_idx
  ON organization_positions (active, title);

CREATE TABLE IF NOT EXISTS organization_assignments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "positionId" uuid NOT NULL REFERENCES organization_positions(id) ON DELETE RESTRICT,
  "userId" varchar(255) NOT NULL,
  "startDate" date NOT NULL,
  "endDate" date,
  note text,
  CONSTRAINT organization_assignments_dates_check
    CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE INDEX IF NOT EXISTS organization_assignments_position_dates_idx
  ON organization_assignments ("positionId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS organization_assignments_user_dates_idx
  ON organization_assignments ("userId", "startDate", "endDate");

-- A position has at most one holder at any point in time, including future-dated assignments.
CREATE OR REPLACE FUNCTION enforce_organization_assignment_no_overlap()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW."positionId"::text));
  IF EXISTS (
    SELECT 1
    FROM organization_assignments existing
    WHERE existing."positionId" = NEW."positionId"
      AND existing.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND existing."startDate" <= COALESCE(NEW."endDate", DATE '9999-12-31')
      AND (existing."endDate" IS NULL OR existing."endDate" >= NEW."startDate")
  ) THEN
    RAISE EXCEPTION 'Organization position assignment periods must not overlap'
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_assignment_no_overlap_guard ON organization_assignments;
CREATE TRIGGER organization_assignment_no_overlap_guard
  BEFORE INSERT OR UPDATE OF "positionId", "startDate", "endDate"
  ON organization_assignments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_organization_assignment_no_overlap();

CREATE TABLE IF NOT EXISTS organization_position_relations (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "parentPositionId" uuid NOT NULL REFERENCES organization_positions(id) ON DELETE RESTRICT,
  "childPositionId" uuid NOT NULL REFERENCES organization_positions(id) ON DELETE RESTRICT,
  "sortOrder" integer NOT NULL DEFAULT 0,
  CONSTRAINT organization_position_relations_not_self_check
    CHECK ("parentPositionId" <> "childPositionId"),
  CONSTRAINT organization_position_relations_sort_check
    CHECK ("sortOrder" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_position_relations_child_unique
  ON organization_position_relations ("childPositionId");
CREATE INDEX IF NOT EXISTS organization_position_relations_parent_idx
  ON organization_position_relations ("parentPositionId");

-- Enforce acyclic hierarchy even when relations are written outside the HTTP service.
CREATE OR REPLACE FUNCTION enforce_organization_position_acyclic()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE descendants(id) AS (
      SELECT relation."childPositionId"
      FROM organization_position_relations relation
      WHERE relation."parentPositionId" = NEW."childPositionId"
        AND relation.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      UNION
      SELECT relation."childPositionId"
      FROM organization_position_relations relation
      JOIN descendants ON relation."parentPositionId" = descendants.id
      WHERE relation.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    SELECT 1 FROM descendants WHERE id = NEW."parentPositionId"
  ) THEN
    RAISE EXCEPTION 'Organization position hierarchy must be acyclic'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_position_acyclic_guard ON organization_position_relations;
CREATE TRIGGER organization_position_acyclic_guard
  BEFORE INSERT OR UPDATE OF "parentPositionId", "childPositionId"
  ON organization_position_relations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_organization_position_acyclic();

-- A project role may be linked to a permanent position or remain project-specific.
ALTER TABLE project_job_positions
  ADD COLUMN IF NOT EXISTS "organizationPositionId" uuid
  REFERENCES organization_positions(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS project_job_positions_organization_position_idx
  ON project_job_positions ("organizationPositionId")
  WHERE "organizationPositionId" IS NOT NULL;
