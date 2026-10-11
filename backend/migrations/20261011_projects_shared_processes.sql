-- Additive foundation for projects and the independent shared-process repository.
-- Existing resources/contents remain the canonical BPMN storage; projects reference
-- process resources instead of owning or copying them.
CREATE TYPE project_member_role_enum AS ENUM ('viewer', 'modeler', 'admin');
CREATE TYPE project_process_usage_enum AS ENUM ('common', 'variant', 'project-specific');

CREATE TABLE projects (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "createdBy" character varying(64) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    name character varying(255) NOT NULL,
    description text
);

CREATE UNIQUE INDEX projects_name_unique_idx ON projects (lower(name));

CREATE TABLE project_processes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "createdBy" character varying(64) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "projectId" uuid NOT NULL,
    "resourceId" uuid NOT NULL,
    usage project_process_usage_enum NOT NULL,
    "sourceResourceId" uuid,
    CONSTRAINT project_processes_project_fk
        FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT project_processes_resource_fk
        FOREIGN KEY ("resourceId") REFERENCES resources(id) ON DELETE RESTRICT,
    CONSTRAINT project_processes_source_resource_fk
        FOREIGN KEY ("sourceResourceId") REFERENCES resources(id) ON DELETE RESTRICT,
    CONSTRAINT project_processes_unique_resource UNIQUE ("projectId", "resourceId"),
    CONSTRAINT project_processes_variant_source_check
        CHECK ((usage = 'variant' AND "sourceResourceId" IS NOT NULL)
            OR (usage <> 'variant' AND "sourceResourceId" IS NULL)),
    CONSTRAINT project_processes_not_self_variant_check
        CHECK ("sourceResourceId" IS NULL OR "sourceResourceId" <> "resourceId")
);

CREATE INDEX project_processes_project_idx ON project_processes ("projectId");
CREATE INDEX project_processes_resource_idx ON project_processes ("resourceId");
CREATE INDEX project_processes_source_idx ON project_processes ("sourceResourceId");

CREATE TABLE project_members (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "createdBy" character varying(64) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "projectId" uuid NOT NULL,
    "userId" character varying(255) NOT NULL,
    role project_member_role_enum NOT NULL DEFAULT 'viewer',
    CONSTRAINT project_members_project_fk
        FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT project_members_unique_user UNIQUE ("projectId", "userId")
);

CREATE INDEX project_members_user_idx ON project_members ("userId");
