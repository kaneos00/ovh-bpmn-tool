-- Issue #125: user-submitted BPMN proposals and controlled modifications.
-- Content status (draft/published/obsolete) remains the technical version lifecycle.
-- Review status belongs to a separate request aggregate.

CREATE TABLE IF NOT EXISTS process_change_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "resourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    "authorId" varchar(64) NOT NULL,
    type varchar(32) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'proposed',
    title varchar(255) NOT NULL,
    description text NOT NULL,
    justification text NULL,
    "sourceContentId" uuid NULL REFERENCES contents(id) ON DELETE RESTRICT,
    "sourceVersion" integer NULL,
    "workingContentId" uuid NULL REFERENCES contents(id) ON DELETE SET NULL,
    "assignedReviewerId" varchar(64) NULL,
    "submittedAt" timestamptz NULL,
    "reviewedAt" timestamptz NULL,
    "decidedAt" timestamptz NULL,
    "publishedContentId" uuid NULL REFERENCES contents(id) ON DELETE SET NULL,
    "createdBy" varchar(64) NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT process_change_requests_type_check
      CHECK (type IN ('proposal', 'content_change')),
    CONSTRAINT process_change_requests_status_check
      CHECK (status IN ('proposed', 'draft', 'in_review', 'changes_requested',
                        'approved', 'rejected', 'published', 'withdrawn')),
    CONSTRAINT process_change_requests_source_version_check
      CHECK ("sourceVersion" IS NULL OR "sourceVersion" > 0),
    CONSTRAINT process_change_requests_working_content_check
      CHECK (type <> 'content_change' OR status = 'proposed' OR "workingContentId" IS NOT NULL
             OR status IN ('rejected', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS process_change_requests_resource_status_idx
    ON process_change_requests ("resourceId", status, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS process_change_requests_author_idx
    ON process_change_requests ("authorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS process_change_requests_reviewer_idx
    ON process_change_requests ("assignedReviewerId", status)
    WHERE "assignedReviewerId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS process_change_request_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "requestId" uuid NOT NULL REFERENCES process_change_requests(id) ON DELETE CASCADE,
    "actorId" varchar(64) NOT NULL,
    event varchar(40) NOT NULL,
    "fromStatus" varchar(32) NULL,
    "toStatus" varchar(32) NULL,
    comment text NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT process_change_request_events_event_check
      CHECK (event IN ('created', 'submitted', 'changes_requested', 'approved',
                       'rejected', 'withdrawn', 'published', 'commented',
                       'conflict_detected'))
);

CREATE INDEX IF NOT EXISTS process_change_request_events_request_idx
    ON process_change_request_events ("requestId", "createdAt" ASC);

-- Keep updatedAt current for writes performed outside TypeORM.
CREATE OR REPLACE FUNCTION set_process_change_request_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_change_requests_updated_at ON process_change_requests;
CREATE TRIGGER process_change_requests_updated_at
BEFORE UPDATE ON process_change_requests
FOR EACH ROW EXECUTE FUNCTION set_process_change_request_updated_at();
