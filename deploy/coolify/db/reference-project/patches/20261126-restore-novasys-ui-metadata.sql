BEGIN;

-- Enable process remarks for the NovaSys demo member only.
UPDATE project_members
SET "canSubmitRemarks" = TRUE
WHERE "projectId" = '8a000000-0000-4000-8000-000000000001'
  AND "userId" = :'demo_user';

-- Restore the six NovaSys process-family labels used by the explorer.
UPDATE resources
SET "processMetadata" = COALESCE("processMetadata", '{}'::jsonb) || jsonb_build_object(
  'nature', 'specific',
  'family', CASE "parentId"
    WHEN '8b000000-0000-4000-8000-000000000002' THEN 'GOV'
    WHEN '8b000000-0000-4000-8000-000000000003' THEN 'HR'
    WHEN '8b000000-0000-4000-8000-000000000004' THEN 'FIN'
    WHEN '8b000000-0000-4000-8000-000000000005' THEN 'IT'
    WHEN '8b000000-0000-4000-8000-000000000006' THEN 'DEL'
    WHEN '8b000000-0000-4000-8000-000000000007' THEN 'MNT'
  END
)
WHERE type = 'process'
  AND "parentId" IN (
    '8b000000-0000-4000-8000-000000000002',
    '8b000000-0000-4000-8000-000000000003',
    '8b000000-0000-4000-8000-000000000004',
    '8b000000-0000-4000-8000-000000000005',
    '8b000000-0000-4000-8000-000000000006',
    '8b000000-0000-4000-8000-000000000007'
  );

COMMIT;
