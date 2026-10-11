-- V2.0alpha: project context schema.
-- Safe to run on an existing installation; does not modify legacy BPMN tables.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  CREATE TYPE project_process_usage_enum AS ENUM ('common', 'variant', 'project-specific');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE project_member_role_enum AS ENUM ('viewer', 'modeler', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL,
  name varchar(255) NOT NULL,
  description text
);

CREATE UNIQUE INDEX IF NOT EXISTS projects_unique_name
  ON projects (name);

CREATE TABLE IF NOT EXISTS project_members (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "userId" varchar(255) NOT NULL,
  role project_member_role_enum DEFAULT 'viewer' NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS project_members_unique_user
  ON project_members ("projectId", "userId");

CREATE INDEX IF NOT EXISTS project_members_user_id_idx
  ON project_members ("userId");

CREATE TABLE IF NOT EXISTS project_processes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "resourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  usage project_process_usage_enum NOT NULL,
  "sourceResourceId" uuid NULL REFERENCES resources(id) ON DELETE RESTRICT,
  CONSTRAINT project_processes_variant_source_check CHECK (
    (usage = 'variant' AND "sourceResourceId" IS NOT NULL AND "sourceResourceId" <> "resourceId")
    OR
    (usage <> 'variant' AND "sourceResourceId" IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS project_processes_unique_resource
  ON project_processes ("projectId", "resourceId");

CREATE INDEX IF NOT EXISTS project_processes_resource_id_idx
  ON project_processes ("resourceId");

CREATE INDEX IF NOT EXISTS project_processes_source_resource_id_idx
  ON project_processes ("sourceResourceId");
