CREATE TABLE IF NOT EXISTS project_documented_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind varchar(24) NOT NULL DEFAULT 'file',
  name varchar(255) NOT NULL,
  description text,
  link text,
  location text,
  access text,
  retention text,
  "authorizedPeople" text,
  restrictions text,
  "originResourceId" uuid REFERENCES resources(id) ON DELETE SET NULL,
  "originElementId" varchar(255),
  "mergedIntoId" uuid REFERENCES project_documented_sources(id) ON DELETE SET NULL,
  "mergedAt" timestamptz,
  "mergedBy" varchar(64),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_documented_sources_kind_check
    CHECK (kind IN ('file', 'database', 'application', 'form'))
);

CREATE INDEX IF NOT EXISTS project_documented_sources_project_active_idx
  ON project_documented_sources ("projectId", "mergedIntoId");

CREATE TABLE IF NOT EXISTS project_documented_source_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "sourceId" uuid NOT NULL REFERENCES project_documented_sources(id) ON DELETE CASCADE,
  "resourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  "elementId" varchar(255) NOT NULL,
  "elementName" varchar(255) NOT NULL,
  "elementType" varchar(64) NOT NULL,
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_documented_source_references_unique_element
    UNIQUE ("projectId", "resourceId", "elementId")
);

CREATE INDEX IF NOT EXISTS project_documented_source_references_source_idx
  ON project_documented_source_references ("sourceId");
CREATE INDEX IF NOT EXISTS project_documented_source_references_project_resource_idx
  ON project_documented_source_references ("projectId", "resourceId");
