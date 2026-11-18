ALTER TABLE project_documented_sources
  ADD COLUMN IF NOT EXISTS "validUntil" date,
  ADD COLUMN IF NOT EXISTS "containsPersonalData" boolean NOT NULL DEFAULT false;
