-- Distinguish temporary acting/interim coverage from a substantive assignment.
-- Existing assignments remain substantive by default.
ALTER TABLE organization_assignments
  ADD COLUMN IF NOT EXISTS "isActing" boolean NOT NULL DEFAULT false;
