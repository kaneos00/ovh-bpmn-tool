-- Keep an optional human-readable change note on each BPMN content version.
ALTER TABLE contents
    ADD COLUMN IF NOT EXISTS "changeComment" text NULL;
