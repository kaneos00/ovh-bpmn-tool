-- Contextual BPMN remarks belong to the proposal workflow, not to BPMN XML.
-- Each remark keeps its author and its own immutable decision trace.
CREATE TABLE IF NOT EXISTS process_change_proposal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "proposalId" uuid NOT NULL REFERENCES process_change_proposals(id) ON DELETE CASCADE,
  "elementId" varchar(255) NOT NULL,
  "authorUserId" uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  comment text NOT NULL CHECK (length(trim(comment)) > 0),
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  "decisionBy" uuid NULL REFERENCES app_users(id) ON DELETE SET NULL,
  "decidedAt" timestamptz NULL,
  "decisionComment" text NULL,
  CONSTRAINT process_change_proposal_comments_decision_consistency
    CHECK (
      (status = 'pending' AND "decisionBy" IS NULL AND "decidedAt" IS NULL)
      OR
      (status IN ('accepted', 'rejected') AND "decisionBy" IS NOT NULL AND "decidedAt" IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS process_change_proposal_comments_proposal_created_idx
  ON process_change_proposal_comments ("proposalId", "createdAt");
CREATE INDEX IF NOT EXISTS process_change_proposal_comments_proposal_status_idx
  ON process_change_proposal_comments ("proposalId", status);
