-- Extend the existing proposal event log with individual contextual-remark decisions.
-- Drop the previous inline CHECK by inspecting its definition, rather than relying
-- on PostgreSQL's generated constraint name. Safe to run repeatedly by Coolify.
DO $remark_event_migration$
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
      'remark_accepted',
      'remark_rejected'
    ));
END;
$remark_event_migration$;
