-- V2.1: retain the provenance of a cloned process.
-- Existing resources remain independent; deleting a source clears the reference.
ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS "sourceResourceId" uuid NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'resources_source_resource_fk'
    ) THEN
        ALTER TABLE resources
            ADD CONSTRAINT resources_source_resource_fk
            FOREIGN KEY ("sourceResourceId") REFERENCES resources(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS resources_source_resource_idx
    ON resources ("sourceResourceId");
