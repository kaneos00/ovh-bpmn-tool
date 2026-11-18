-- PostgreSQL integration checks for safe resource-tree deletion.
-- Temporary tables shadow application tables in this session; all changes
-- are rolled back and no persistent demo data is modified.
\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE resources (
  id uuid PRIMARY KEY,
  "parentId" uuid NULL,
  "sourceResourceId" uuid NULL
);
ALTER TABLE resources
  ADD CONSTRAINT resources_source_fk
  FOREIGN KEY ("sourceResourceId") REFERENCES resources(id) ON DELETE SET NULL;

CREATE TEMP TABLE projects (
  id uuid PRIMARY KEY
);

CREATE TEMP TABLE project_processes (
  id uuid PRIMARY KEY,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "resourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
  usage text NOT NULL CHECK (usage IN ('common', 'variant', 'project-specific')),
  "sourceResourceId" uuid NULL REFERENCES resources(id) ON DELETE RESTRICT,
  CONSTRAINT project_processes_variant_source_check CHECK (
    (usage = 'variant' AND "sourceResourceId" IS NOT NULL
      AND "sourceResourceId" <> "resourceId")
    OR (usage <> 'variant' AND "sourceResourceId" IS NULL)
  )
);

CREATE TEMP TABLE process_change_proposals (
  id uuid PRIMARY KEY,
  "sourceResourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
  "cloneResourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE RESTRICT
);
CREATE TEMP TABLE process_change_proposal_comments (
  id uuid PRIMARY KEY,
  "proposalId" uuid NOT NULL REFERENCES process_change_proposals(id) ON DELETE CASCADE
);
CREATE TEMP TABLE process_change_proposal_events (
  id uuid PRIMARY KEY,
  "proposalId" uuid NOT NULL REFERENCES process_change_proposals(id) ON DELETE CASCADE
);

INSERT INTO projects VALUES
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');

-- Case 1: a source and all its variants are inside the same deleted folder.
INSERT INTO resources (id, "parentId", "sourceResourceId") VALUES
  ('20000000-0000-4000-8000-000000000001', NULL, NULL),
  ('20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', NULL),
  ('20000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002');

INSERT INTO project_processes VALUES
  ('30000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   'project-specific', NULL),
  ('30000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000003',
   'variant', '20000000-0000-4000-8000-000000000002');

INSERT INTO process_change_proposals VALUES (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003'
);
INSERT INTO process_change_proposal_comments VALUES (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001'
);
INSERT INTO process_change_proposal_events VALUES (
  '60000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001'
);

-- Match the repository's transaction ordering: remove proposal workflow rows,
-- then project associations, then the complete resource subtree.
DELETE FROM process_change_proposals
 WHERE "sourceResourceId" IN (
   '20000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000003'
 )
 OR "cloneResourceId" IN (
   '20000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000003'
 );
DELETE FROM project_processes
 WHERE "resourceId" IN (
   '20000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000003'
 );
DELETE FROM resources
 WHERE id IN (
   '20000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000003'
 );

DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM resources WHERE id IN (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003'
  )) THEN
    RAISE EXCEPTION 'source and in-tree variant resources were not fully deleted';
  END IF;
  IF EXISTS (SELECT 1 FROM process_change_proposals)
     OR EXISTS (SELECT 1 FROM process_change_proposal_comments)
     OR EXISTS (SELECT 1 FROM process_change_proposal_events) THEN
    RAISE EXCEPTION 'proposal, comment or event cleanup failed';
  END IF;
END
$test$;

-- Case 2: a source cannot be deleted while a variant survives elsewhere.
INSERT INTO resources (id, "parentId", "sourceResourceId") VALUES
  ('20000000-0000-4000-8000-000000000004', NULL, NULL),
  ('20000000-0000-4000-8000-000000000005',
   '20000000-0000-4000-8000-000000000004', NULL),
  ('20000000-0000-4000-8000-000000000006', NULL,
   '20000000-0000-4000-8000-000000000005');
INSERT INTO project_processes VALUES (
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000006',
  'variant', '20000000-0000-4000-8000-000000000005'
);

DO $test$
DECLARE
  surviving_variant_count integer;
BEGIN
  SELECT count(*) INTO surviving_variant_count
    FROM project_processes
   WHERE "sourceResourceId" = '20000000-0000-4000-8000-000000000005'
     AND "resourceId" <> ALL(ARRAY[
       '20000000-0000-4000-8000-000000000004'::uuid,
       '20000000-0000-4000-8000-000000000005'::uuid
     ]);
  IF surviving_variant_count <> 1 THEN
    RAISE EXCEPTION 'expected one dependent variant outside the deleted tree';
  END IF;

  BEGIN
    DELETE FROM resources
     WHERE id = '20000000-0000-4000-8000-000000000005';
    RAISE EXCEPTION 'source deletion unexpectedly bypassed the variant FK';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  IF NOT EXISTS (SELECT 1 FROM resources
                  WHERE id = '20000000-0000-4000-8000-000000000005') THEN
    RAISE EXCEPTION 'source resource disappeared despite surviving variant';
  END IF;
END
$test$;

-- Case 3: a shared process in a deleted folder is detached and preserved.
INSERT INTO resources (id, "parentId", "sourceResourceId") VALUES
  ('20000000-0000-4000-8000-000000000007', NULL, NULL),
  ('20000000-0000-4000-8000-000000000008',
   '20000000-0000-4000-8000-000000000007', NULL),
  ('20000000-0000-4000-8000-000000000009',
   '20000000-0000-4000-8000-000000000007', NULL);
INSERT INTO project_processes VALUES
  ('30000000-0000-4000-8000-000000000004',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000008',
   'project-specific', NULL),
  ('30000000-0000-4000-8000-000000000005',
   '10000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000008',
   'project-specific', NULL),
  ('30000000-0000-4000-8000-000000000006',
   '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000009',
   'common', NULL);

UPDATE resources
   SET "parentId" = NULL
 WHERE id IN (
   '20000000-0000-4000-8000-000000000008',
   '20000000-0000-4000-8000-000000000009'
 )
   AND "parentId" = '20000000-0000-4000-8000-000000000007';
DELETE FROM resources WHERE id = '20000000-0000-4000-8000-000000000007';

DO $test$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM resources
                  WHERE id = '20000000-0000-4000-8000-000000000008'
                    AND "parentId" IS NULL) THEN
    RAISE EXCEPTION 'shared process was not preserved at the root';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM resources
                  WHERE id = '20000000-0000-4000-8000-000000000009'
                    AND "parentId" IS NULL) THEN
    RAISE EXCEPTION 'common process was not preserved at the root';
  END IF;
END
$test$;

ROLLBACK;

SELECT 'resource deletion PostgreSQL invariants: OK' AS result;
