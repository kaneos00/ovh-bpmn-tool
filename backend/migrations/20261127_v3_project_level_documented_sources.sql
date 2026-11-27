-- Move documented information ownership to the project level.
-- Restore rows archived by the immediately preceding process-ownership migration,
-- then make the legacy resourceId optional for compatibility with old API clients.
BEGIN;

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

DROP INDEX IF EXISTS project_documented_sources_process_active_idx;
CREATE INDEX IF NOT EXISTS project_documented_sources_project_active_idx
  ON project_documented_sources ("projectId", "mergedIntoId");

COMMIT;
