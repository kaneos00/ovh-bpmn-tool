ALTER TABLE project_documented_sources
  ADD COLUMN IF NOT EXISTS "validUntil" date;
