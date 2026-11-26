-- Every documented source belongs to exactly one process. Its optional
-- BPMN association remains in project_documented_source_references.
ALTER TABLE project_documented_sources
  ADD COLUMN IF NOT EXISTS "resourceId" uuid;

-- Backfill sources whose existing BPMN references identify one unambiguous process.
WITH ownership AS (
  SELECT
    reference."sourceId",
    MIN(reference."resourceId"::text)::uuid AS "resourceId"
  FROM project_documented_source_references AS reference
  JOIN project_documented_sources AS source
    ON source.id = reference."sourceId"
  JOIN project_processes AS process
    ON process."projectId" = source."projectId"
   AND process."resourceId" = reference."resourceId"
  GROUP BY reference."sourceId"
  HAVING COUNT(DISTINCT reference."resourceId") = 1
     AND COUNT(*) = (
       SELECT COUNT(*)
       FROM project_documented_source_references AS all_references
       WHERE all_references."sourceId" = reference."sourceId"
     )
)
UPDATE project_documented_sources AS source
SET "resourceId" = ownership."resourceId"
FROM ownership
WHERE source.id = ownership."sourceId"
  AND source."resourceId" IS NULL;

-- Keep unresolved legacy/test rows and their BPMN links for audit, rather than
-- assigning them arbitrarily or silently discarding their content.
CREATE TABLE IF NOT EXISTS project_documented_sources_legacy_archive (
  id uuid PRIMARY KEY,
  "projectId" uuid NOT NULL,
  source_data jsonb NOT NULL,
  references_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  archive_reason text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO project_documented_sources_legacy_archive
  (id, "projectId", source_data, references_data, archive_reason)
SELECT
  source.id,
  source."projectId",
  to_jsonb(source),
  COALESCE(
    jsonb_agg(to_jsonb(reference)) FILTER (WHERE reference.id IS NOT NULL),
    '[]'::jsonb
  ),
  CASE
    WHEN COUNT(DISTINCT reference."resourceId") = 0
      THEN 'missing_process_ownership'
    ELSE 'multiple_process_ownerships'
  END
FROM project_documented_sources AS source
LEFT JOIN project_documented_source_references AS reference
  ON reference."sourceId" = source.id
WHERE source."resourceId" IS NULL
GROUP BY source.id
ON CONFLICT (id) DO NOTHING;

DELETE FROM project_documented_source_references
WHERE "sourceId" IN (
  SELECT id FROM project_documented_sources WHERE "resourceId" IS NULL
);

DELETE FROM project_documented_sources
WHERE "resourceId" IS NULL;

ALTER TABLE project_documented_sources
  ALTER COLUMN "resourceId" SET NOT NULL;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_documented_sources_process_fk'
      AND conrelid = 'project_documented_sources'::regclass
  ) THEN
    ALTER TABLE project_documented_sources
      ADD CONSTRAINT project_documented_sources_process_fk
      FOREIGN KEY ("projectId", "resourceId")
      REFERENCES project_processes ("projectId", "resourceId")
      ON DELETE CASCADE;
  END IF;
END $;

CREATE INDEX IF NOT EXISTS project_documented_sources_process_active_idx
  ON project_documented_sources ("projectId", "resourceId", "mergedIntoId");
