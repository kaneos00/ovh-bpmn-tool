-- A canonical documented source can be referenced by several BPMN resources,
-- but only once within a given resource (one BPMN diagram).
CREATE INDEX IF NOT EXISTS project_documented_source_references_source_resource_idx
  ON project_documented_source_references ("projectId", "sourceId", "resourceId");
