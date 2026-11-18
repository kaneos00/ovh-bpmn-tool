-- Run after 00-job-functions.sql and 10-project-processes.sql.
-- This script is read-only except for parsing BPMN XML; any mismatch aborts with a clear error.
DO $verify$
DECLARE n integer; item record;
BEGIN
  SELECT count(*) INTO n FROM projects WHERE id='a1000000-0000-4000-8000-000000000001';
  IF n <> 1 THEN RAISE EXCEPTION 'Expected one demo project, got %', n; END IF;

  SELECT count(*) INTO n FROM project_processes WHERE "projectId"='a1000000-0000-4000-8000-000000000001';
  IF n <> 22 THEN RAISE EXCEPTION 'Expected 22 BPMN processes, got %', n; END IF;

  SELECT count(*) INTO n FROM project_raci_entries WHERE "projectId"='a1000000-0000-4000-8000-000000000001';
  IF n <> 377 THEN RAISE EXCEPTION 'Expected 377 RACI entries, got %', n; END IF;

  SELECT count(*) INTO n FROM project_raci_actors WHERE "projectId"='a1000000-0000-4000-8000-000000000001';
  IF n <> 24 THEN RAISE EXCEPTION 'Expected 24 RACI actors, got %', n; END IF;

  SELECT count(*) INTO n FROM project_job_positions WHERE "projectId"='a1000000-0000-4000-8000-000000000001';
  IF n <> 17 THEN RAISE EXCEPTION 'Expected 17 project positions, got %', n; END IF;

  SELECT count(*) INTO n FROM position_raci_actor_mappings WHERE "projectId"='a1000000-0000-4000-8000-000000000001';
  IF n <> 17 THEN RAISE EXCEPTION 'Expected 17 position/RACI mappings, got %', n; END IF;

  SELECT count(*) INTO n FROM position_activity_mappings WHERE "projectId"='a1000000-0000-4000-8000-000000000001';
  IF n <> 150 THEN RAISE EXCEPTION 'Expected 150 position/activity mappings, got %', n; END IF;

  SELECT count(*) INTO n
  FROM contents c
  JOIN resources r ON r.id=c."resourceId"
  WHERE r."createdBy"='demo-software' AND r.type='process'
    AND c.content LIKE '%<bpmn:exclusiveGateway%';
  IF n <> 4 THEN RAISE EXCEPTION 'Expected 4 HR contract-variant gateways, got %', n; END IF;

  -- Parsing every BPMN payload catches malformed XML before the demo is opened in the modeler.
  FOR item IN
    SELECT c.content
    FROM contents c
    JOIN resources r ON r.id=c."resourceId"
    WHERE r."createdBy"='demo-software' AND r.type='process'
  LOOP
    PERFORM xmlparse(document item.content);
  END LOOP;

  SELECT count(*) INTO n FROM job_functions
  WHERE id BETWEEN '84000000-0000-4000-8000-000000000001'::uuid
               AND '84000000-0000-4000-8000-000000000017'::uuid;
  IF n <> 17 THEN RAISE EXCEPTION 'Expected 17 job functions, got %', n; END IF;

  SELECT count(*) INTO n FROM competency_blocks
  WHERE id BETWEEN '85000000-0000-4000-8000-000000000001'::uuid
               AND '85000000-0000-4000-8000-000000000010'::uuid;
  IF n <> 10 THEN RAISE EXCEPTION 'Expected 10 competency blocks, got %', n; END IF;

  SELECT count(*) INTO n FROM competencies
  WHERE id BETWEEN '86000000-0000-4000-8000-000000000001'::uuid
               AND '86000000-0000-4000-8000-000000000030'::uuid;
  IF n <> 30 THEN RAISE EXCEPTION 'Expected 30 competencies, got %', n; END IF;

  SELECT count(*) INTO n FROM job_function_activity_sections
  WHERE id BETWEEN '88000000-0000-4000-8000-000000000001'::uuid
               AND '88000000-0000-4000-8000-000000000017'::uuid;
  IF n <> 17 THEN RAISE EXCEPTION 'Expected 17 function activity sections, got %', n; END IF;
END
$verify$;
