-- Project members can be explicitly granted the right to submit contextual BPMN remarks.
-- Existing memberships remain disabled until a project administrator opts in.
ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS "canSubmitRemarks" boolean NOT NULL DEFAULT false;
