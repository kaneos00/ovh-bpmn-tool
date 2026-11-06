-- Project-level fallback validator for process validation requests.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "defaultValidatorUserId" character varying(255);
