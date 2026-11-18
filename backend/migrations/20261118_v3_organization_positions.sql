-- Permanent company organization structure. Additive: does not alter project RACI/BPMN data.
CREATE TABLE IF NOT EXISTS organization_positions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title varchar(255) NOT NULL,
  description text,
  "functionId" uuid REFERENCES job_functions(id) ON DELETE RESTRICT,
  "parentPositionId" uuid REFERENCES organization_positions(id) ON DELETE RESTRICT,
  "sortOrder" integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT organization_positions_not_own_parent CHECK ("parentPositionId" IS NULL OR "parentPositionId" <> id),
  CONSTRAINT organization_positions_sort_order_check CHECK ("sortOrder" >= 0)
);
CREATE INDEX IF NOT EXISTS organization_positions_parent_idx ON organization_positions ("parentPositionId");
CREATE INDEX IF NOT EXISTS organization_positions_active_sort_idx ON organization_positions (active, "sortOrder", title);
