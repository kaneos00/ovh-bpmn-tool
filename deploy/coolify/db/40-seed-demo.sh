#!/bin/sh
set -eu
: "${DEMO_AUTH_USER:?Set DEMO_AUTH_USER in Coolify}"
psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=demo_user="$DEMO_AUTH_USER" \
  --file=/opt/seed-demo.sql

# Additional organization/process demo dataset (dedicated demo database only).
psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=demo_user="$DEMO_AUTH_USER" \
  --file=/opt/seed-organization-demo.sql
