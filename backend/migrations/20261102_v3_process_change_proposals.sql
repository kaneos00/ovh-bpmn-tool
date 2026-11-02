-- V3: proposal-based process changes.
-- The clone is a separate workspace; the source publication remains untouched
-- until a later, explicitly approved atomic promotion operation.
ALTER TYPE contents_status_enum ADD VALUE IF NOT EXISTS 'submitted';

CREATE TABLE IF NOT EXISTS process_change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "sourceResourceId" uuid NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
  "cloneResourceId" uuid NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  "sourcePublishedContentId" uuid NOT NULL REFERENCES contents(id) ON DELETE RESTRICT,
  "submittedContentId" uuid NULL REFERENCES contents(id) ON DELETE RESTRICT,
  "authorUserId" uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  "validatorUserId" uuid NULL REFERENCES app_users(id) ON DELETE SET NULL,
  status varchar(16) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'published')),
  "submissionComment" text NULL,
  "submittedAt" timestamptz NULL,
  "decidedAt" timestamptz NULL,
  CONSTRAINT process_change_proposals_distinct_resources
    CHECK ("sourceResourceId" <> "cloneResourceId")
);

CREATE INDEX IF NOT EXISTS process_change_proposals_project_status_idx
  ON process_change_proposals ("projectId", status);
CREATE INDEX IF NOT EXISTS process_change_proposals_source_idx
  ON process_change_proposals ("sourceResourceId");

CREATE TABLE IF NOT EXISTS process_change_proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "proposalId" uuid NOT NULL REFERENCES process_change_proposals(id) ON DELETE CASCADE,
  "eventType" varchar(32) NOT NULL
    CHECK ("eventType" IN ('created', 'submitted', 'reassigned', 'approved', 'changes_requested', 'rejected', 'published')),
  "actorUserId" uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  "validatorUserId" uuid NULL REFERENCES app_users(id) ON DELETE SET NULL,
  comment text NULL,
  details jsonb NULL
);

CREATE INDEX IF NOT EXISTS process_change_proposal_events_proposal_created_idx
  ON process_change_proposal_events ("proposalId", "createdAt");
