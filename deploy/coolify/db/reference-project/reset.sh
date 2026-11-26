#!/bin/sh
set -eu
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"
: "${DEMO_AUTH_USER:?Set DEMO_AUTH_USER to the user who should own the reference project}"
PROJECT_ID='8a000000-0000-4000-8000-000000000001'
echo "This operation deletes only the KHI-FLOWS reference project and its uniquely namespaced resources."
echo "Database: $POSTGRES_DB | Project: $PROJECT_ID"
if [ "${CONFIRM_REFERENCE_PROJECT_RESET:-}" != "YES" ]; then
  echo "Set CONFIRM_REFERENCE_PROJECT_RESET=YES to continue." >&2
  exit 2
fi
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=project_id="$PROJECT_ID" <<'SQL'
BEGIN;
DELETE FROM project_documented_source_references WHERE "projectId" = :'project_id';
DELETE FROM project_documented_sources WHERE "projectId" = :'project_id';
DELETE FROM project_raci_entries WHERE "projectId" = :'project_id';
DELETE FROM project_raci_actors WHERE "projectId" = :'project_id';
DELETE FROM project_processes WHERE "projectId" = :'project_id';
DELETE FROM project_members WHERE "projectId" = :'project_id';
DELETE FROM contents WHERE "resourceId" IN (
  SELECT id FROM resources WHERE id::text LIKE '8b000000-%' OR id::text LIKE '8b000001-%'
);
DELETE FROM resources WHERE id::text LIKE '8b000001-%';
DELETE FROM resources WHERE id::text LIKE '8b000000-%' AND depth = 1;
DELETE FROM resources WHERE id::text LIKE '8b000000-%' AND depth = 0;
DELETE FROM projects WHERE id = :'project_id';
COMMIT;
SQL
echo "Reference project removed. Re-run seed.sql to recreate it."
