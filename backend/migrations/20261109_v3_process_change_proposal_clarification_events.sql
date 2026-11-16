-- Add clarification requests and author responses to the proposal event log.
-- This is a new migration: the original remark-event migration may already have
-- been applied in existing environments. Safe to run repeatedly by Coolify.
DO $remark_clarification_event_migration$
DECLARE
  existing_constraint record;
BEGIN
  FOR existing_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'process_change_proposal_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%eventType%'
  LOOP
    EXECUTE format(
      'ALTER TABLE process_change_proposal_events DROP CONSTRAINT %I',
      existing_constraint.conname
    );
  END LOOP;

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
      'remark_added',
      'remark_accepted',
      'remark_rejected',
      'remark_clarification_requested',
      'remark_author_responded'
    ));
END;
$remark_clarification_event_migration$;
