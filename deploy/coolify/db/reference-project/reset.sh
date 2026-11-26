#!/bin/sh
set -eu
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"
PROJECT_ID='8a000000-0000-4000-8000-000000000001'
ROOT_RESOURCE_ID='8b000000-0000-4000-8000-000000000001'
echo "This operation resets only the KHI-FLOWS reference project and its unshared resources."
echo "Database: $POSTGRES_DB | Project: $PROJECT_ID"
if [ "${CONFIRM_REFERENCE_PROJECT_RESET:-}" != "YES" ]; then
  echo "Set CONFIRM_REFERENCE_PROJECT_RESET=YES to continue." >&2
  exit 2
fi
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=project_id="$PROJECT_ID" --set=root_resource_id="$ROOT_RESOURCE_ID" <<'SQL'
BEGIN;

-- Capture the reference resource tree and every process currently assigned to this project
-- before removing project links. This also catches test-created resources below the root.
CREATE TEMP TABLE reference_resource_ids ON COMMIT DROP AS
WITH RECURSIVE roots(id) AS (
  SELECT id FROM resources WHERE id = :'root_resource_id'
  UNION
  SELECT "resourceId" FROM project_processes WHERE "projectId" = :'project_id'
),
tree(id) AS (
  SELECT id FROM roots
  UNION
  SELECT r.id FROM resources r JOIN tree t ON r."parentId" = t.id
)
SELECT DISTINCT id FROM tree;

DELETE FROM project_documented_source_references WHERE "projectId" = :'project_id';
DELETE FROM project_documented_sources WHERE "projectId" = :'project_id';
DELETE FROM project_raci_entries WHERE "projectId" = :'project_id';
DELETE FROM project_raci_actors WHERE "projectId" = :'project_id';
DELETE FROM project_processes WHERE "projectId" = :'project_id';
DELETE FROM project_members WHERE "projectId" = :'project_id';

-- Preserve any resource still referenced by another project, including its content.
DELETE FROM contents c
USING reference_resource_ids x
WHERE c."resourceId" = x.id
  AND NOT EXISTS (
    SELECT 1 FROM project_processes pp WHERE pp."resourceId" = x.id
  );

-- Delete only unshared resources, leaf-first. A shared resource or a folder containing
-- a resource still used by another project is deliberately retained.
DO $$
DECLARE
  removed_count integer;
BEGIN
  LOOP
    DELETE FROM resources r
    USING reference_resource_ids x
    WHERE r.id = x.id
      AND NOT EXISTS (
        SELECT 1 FROM project_processes pp WHERE pp."resourceId" = r.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM resources child WHERE child."parentId" = r.id
      );
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    EXIT WHEN removed_count = 0;
  END LOOP;
END $$;

DELETE FROM projects WHERE id = :'project_id';
COMMIT;
SQL
echo "Reference project reset. Re-run seed.sql to recreate the clean baseline."
