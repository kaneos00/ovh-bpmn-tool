-- Persistent project actor register. Run after 20261011_v2_project_raci.sql.
CREATE TABLE IF NOT EXISTS project_raci_actors (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  "normalizedName" varchar(255) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  origin varchar(16) NOT NULL DEFAULT 'manual',
  CONSTRAINT project_raci_actors_origin_check CHECK (origin IN ('manual', 'bpmn'))
);

CREATE UNIQUE INDEX IF NOT EXISTS project_raci_actors_unique_name
  ON project_raci_actors ("projectId", "normalizedName");
CREATE INDEX IF NOT EXISTS project_raci_actors_project_active_idx
  ON project_raci_actors ("projectId", active);

-- Preserve actors already used by the existing matrix before introducing the register.
INSERT INTO project_raci_actors
  ("projectId", name, "normalizedName", active, origin, "createdBy")
SELECT
  "projectId",
  min(btrim("actorName")),
  lower(btrim("actorName")),
  true,
  'manual',
  min("createdBy")
FROM project_raci_entries
WHERE btrim("actorName") <> ''
GROUP BY "projectId", lower(btrim("actorName"))
ON CONFLICT ("projectId", "normalizedName") DO NOTHING;

-- Canonicalize existing assignment names to the register's case-insensitive actor name.
UPDATE project_raci_entries AS entry
SET "actorName" = actor.name
FROM project_raci_actors AS actor
WHERE actor."projectId" = entry."projectId"
  AND actor."normalizedName" = lower(btrim(entry."actorName"))
  AND entry."actorName" <> actor.name;
