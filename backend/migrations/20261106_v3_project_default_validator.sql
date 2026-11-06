-- Ticket #125: explicit project-level fallback validator for process change proposals.
-- Apply this migration to an existing database before deploying the application code.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "defaultValidatorUserId" character varying(255);

COMMENT ON COLUMN projects."defaultValidatorUserId" IS
  'Project member username used as fallback validator when the BPMN process pilot cannot be assigned';
