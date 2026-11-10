-- Structured function documents and extensible activity/custom sections.
-- Additive migration. Version approval workflow and document exports remain phase 2.

ALTER TABLE job_functions
  ADD COLUMN IF NOT EXISTS attachment varchar(255),
  ADD COLUMN IF NOT EXISTS "documentDate" date,
  ADD COLUMN IF NOT EXISTS "documentVersion" varchar(32),
  ADD COLUMN IF NOT EXISTS "establishedBy" varchar(255),
  ADD COLUMN IF NOT EXISTS "validatedBy" varchar(255),
  ADD COLUMN IF NOT EXISTS mission text;

CREATE TABLE IF NOT EXISTS job_function_activity_sections (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "functionId" uuid NOT NULL REFERENCES job_functions(id) ON DELETE CASCADE,
  code varchar(64) NOT NULL,
  title varchar(255) NOT NULL,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sortOrder" integer NOT NULL DEFAULT 0,
  CONSTRAINT job_function_activity_sections_tasks_array_check CHECK (jsonb_typeof(tasks) = 'array'),
  CONSTRAINT job_function_activity_sections_sort_check CHECK ("sortOrder" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS job_function_activity_sections_function_code_unique
  ON job_function_activity_sections ("functionId", code);
CREATE INDEX IF NOT EXISTS job_function_activity_sections_function_order_idx
  ON job_function_activity_sections ("functionId", "sortOrder");

CREATE TABLE IF NOT EXISTS job_function_custom_sections (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  "createdBy" varchar(64) NOT NULL DEFAULT 'system',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "functionId" uuid NOT NULL REFERENCES job_functions(id) ON DELETE CASCADE,
  "sectionKey" varchar(64) NOT NULL,
  title varchar(255) NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  "sortOrder" integer NOT NULL DEFAULT 0,
  CONSTRAINT job_function_custom_sections_content_object_check CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT job_function_custom_sections_sort_check CHECK ("sortOrder" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS job_function_custom_sections_function_key_unique
  ON job_function_custom_sections ("functionId", "sectionKey");
CREATE INDEX IF NOT EXISTS job_function_custom_sections_function_order_idx
  ON job_function_custom_sections ("functionId", "sortOrder");
