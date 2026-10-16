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


-- Local accounts: passwords are scrypt hashes; global roles complement project memberships.
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(64) NOT NULL,
  email varchar(254),
  password_hash text NOT NULL,
  global_role varchar(16) NOT NULL CHECK (global_role IN ('admin', 'modeler', 'viewer')),
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_unique ON app_users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique ON app_users (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_users_active_role_idx ON app_users (active, global_role);
