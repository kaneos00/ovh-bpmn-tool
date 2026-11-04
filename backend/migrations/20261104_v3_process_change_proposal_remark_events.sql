-- Extend the existing proposal event log with individual contextual-remark decisions.
-- Idempotent so the Coolify migration container can safely run on every release.
DO $remark_event_migration$
BEGIN
  ALTER TABLE process_change_proposal_events
    DROP CONSTRAINT IF EXISTS process_change_proposal_events_eventType_check;
  ALTER TABLE process_change_proposal_events
    DROP CONSTRAINT IF EXISTS process_change_proposal_events_event_type_allowed;

  ALTER TABLE process_change_proposal_events
    ADD CONSTRAINT process_change_proposal_events_event_type_allowed
    CHECK ("eventType" IN (
      'created',
      'submitted',
      'reassigned',
      'approved',
      'changes_requested',
      'rejected',
      'published',
      'remark_accepted',
      'remark_rejected'
    ));
END;
$remark_event_migration$;
