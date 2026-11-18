-- Extend existing project documented information records without deleting
-- previously stored metadata. Legacy "form" records are normalized to the
-- supported Application kind.
ALTER TABLE project_documented_sources
  ADD COLUMN IF NOT EXISTS "originResourceId" uuid REFERENCES resources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "originElementId" varchar(255),
  ADD COLUMN IF NOT EXISTS "validUntil" date;

UPDATE project_documented_sources
SET kind = 'application'
WHERE kind = 'form';

ALTER TABLE project_documented_sources
  DROP CONSTRAINT IF EXISTS project_documented_sources_kind_check;

ALTER TABLE project_documented_sources
  ADD CONSTRAINT project_documented_sources_kind_check
  CHECK (kind IN ('file', 'database', 'application'));
