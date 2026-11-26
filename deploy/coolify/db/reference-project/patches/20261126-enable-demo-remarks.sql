BEGIN;
UPDATE project_members
SET "canSubmitRemarks" = TRUE
WHERE "projectId" = '8a000000-0000-4000-8000-000000000001'
  AND "userId" = :'demo_user';
COMMIT;
