-- Promote documented information to project ownership while preserving
-- process visibility independently from BPMN element associations.
BEGIN;

-- Restore records archived by the preceding process-ownership migration.
INSERT INTO project_documented_sources
SELECT (jsonb_populate_record(NULL::project_documented_sources, archive.source_data)).*
FROM project_documented_sources_legacy_archive AS archive
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_documented_source_references
SELECT (jsonb_populate_record(NULL::project_documented_source_references, reference_row)).*
FROM project_documented_sources_legacy_archive AS archive
CROSS JOIN LATERAL jsonb_array_elements(archive.references_data) AS reference_row
ON CONFLICT (id) DO NOTHING;

ALTER TABLE project_documented_sources
  DROP CONSTRAINT IF EXISTS project_documented_sources_process_fk;

ALTER TABLE project_documented_sources
  ALTER COLUMN "resourceId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS project_documented_source_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "sourceId" uuid NOT NULL,
  "resourceId" uuid NOT NULL,
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_documented_source_processes_source_fk
    FOREIGN KEY ("sourceId") REFERENCES project_documented_sources(id) ON DELETE CASCADE,
  CONSTRAINT project_documented_source_processes_process_fk
    FOREIGN KEY ("projectId", "resourceId")
    REFERENCES project_processes ("projectId", "resourceId") ON DELETE CASCADE,
  CONSTRAINT project_documented_source_processes_unique
    UNIQUE ("projectId", "sourceId", "resourceId")
);

-- Preserve the process context of every legacy source, including sources
-- that had no BPMN element association.
INSERT INTO project_documented_source_processes
  ("projectId", "sourceId", "resourceId", "createdBy")
SELECT source."projectId", source.id, source."resourceId", source."createdBy"
FROM project_documented_sources AS source
WHERE source."resourceId" IS NOT NULL
ON CONFLICT ("projectId", "sourceId", "resourceId") DO NOTHING;

-- Every existing BPMN reference also makes the source visible in that process.
INSERT INTO project_documented_source_processes
  ("projectId", "sourceId", "resourceId", "createdBy")
SELECT reference."projectId", reference."sourceId", reference."resourceId", reference."createdBy"
FROM project_documented_source_references AS reference
ON CONFLICT ("projectId", "sourceId", "resourceId") DO NOTHING;

ALTER TABLE project_documented_sources
  DROP COLUMN IF EXISTS "resourceId";

DROP INDEX IF EXISTS project_documented_sources_process_active_idx;
CREATE INDEX IF NOT EXISTS project_documented_sources_project_active_idx
  ON project_documented_sources ("projectId", "mergedIntoId");

COMMIT;
