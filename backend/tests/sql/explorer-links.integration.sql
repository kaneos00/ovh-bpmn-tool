-- PostgreSQL integration test for the exact XPath expressions used by
-- ContentTypeOrmRepository.findExplorerProcessLinks().
-- Run with: psql -v ON_ERROR_STOP=1 -f backend/tests/sql/explorer-links.integration.sql

BEGIN;

CREATE TEMP TABLE contents (
  "resourceId" uuid NOT NULL,
  content text NOT NULL,
  status text NOT NULL,
  version integer,
  "createdAt" timestamptz NOT NULL
) ON COMMIT DROP;

INSERT INTO contents ("resourceId", content, status, version, "createdAt") VALUES
(
  '00000000-0000-4000-8000-000000000001',
  '<?xml version="1.0" encoding="UTF-8"?>
   <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
     xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI">
     <bpmn:process id="Process_Main">
       <bpmn:callActivity id="Call_Sub" calledElement="Process_Sub"/>
       <bpmn:subProcess id="Sub_Collapsed"/>
       <bpmn:subProcess id="Sub_Expanded"/>
     </bpmn:process>
     <bpmn:process id="Process_Sub"/>
     <bpmndi:BPMNDiagram>
       <bpmndi:BPMNPlane>
         <bpmndi:BPMNShape bpmnElement="Sub_Collapsed" isExpanded="false"/>
         <bpmndi:BPMNShape bpmnElement="Sub_Expanded" isExpanded="true"/>
       </bpmndi:BPMNPlane>
     </bpmndi:BPMNDiagram>
   </bpmn:definitions>',
  'published', 2, now()
),
(
  '00000000-0000-4000-8000-000000000001',
  '<definitions><process id="Process_Old"/></definitions>',
  'published', 1, now() - interval '1 day'
),
(
  '00000000-0000-4000-8000-000000000001',
  '<definitions><process id="Process_Draft"/></definitions>',
  'draft', 99, now() + interval '1 day'
),
(
  '00000000-0000-4000-8000-000000000002',
  '<definitions><process id="Process_Only"/></definitions>',
  'published', 1, now()
);

DO $test$
DECLARE
  result record;
BEGIN
  WITH latest_published AS (
    SELECT DISTINCT ON ("resourceId")
      "resourceId", content
    FROM contents
    WHERE "resourceId" = ANY(ARRAY[
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-4000-8000-000000000003'::uuid
    ])
      AND status = 'published'
    ORDER BY "resourceId", version DESC NULLS LAST, "createdAt" DESC
  )
  SELECT
    "resourceId",
    ARRAY(
      SELECT regexp_replace(node::text, '^.*="([^"]*)".*$', '\\1')
      FROM unnest(xpath('//*[local-name()="process"]/@id', content::xml)) AS extracted(node)
    ) AS process_ids,
    ARRAY(
      SELECT regexp_replace(node::text, '^.*="([^"]*)".*$', '\\1')
      FROM unnest(xpath('//*[local-name()="callActivity"]/@calledElement', content::xml)) AS extracted(node)
    ) AS call_targets,
    ARRAY(
      SELECT regexp_replace(node::text, '^.*="([^"]*)".*$', '\\1')
      FROM unnest(xpath('//*[local-name()="subProcess" and @id = //*[local-name()="BPMNShape" and @isExpanded="false"]/@bpmnElement]/@id', content::xml)) AS extracted(node)
    ) AS collapsed_targets
  INTO result
  FROM latest_published
  WHERE "resourceId" = '00000000-0000-4000-8000-000000000001';

  IF result.process_ids IS DISTINCT FROM ARRAY['Process_Main', 'Process_Sub']::text[] THEN
    RAISE EXCEPTION 'Unexpected process IDs: %', result.process_ids;
  END IF;
  IF result.call_targets IS DISTINCT FROM ARRAY['Process_Sub']::text[] THEN
    RAISE EXCEPTION 'Unexpected Call Activity targets: %', result.call_targets;
  END IF;
  IF result.collapsed_targets IS DISTINCT FROM ARRAY['Sub_Collapsed']::text[] THEN
    RAISE EXCEPTION 'Unexpected collapsed SubProcess targets: %', result.collapsed_targets;
  END IF;

  IF (SELECT count(*) FROM latest_published) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two resources with published content';
  END IF;

  RAISE NOTICE 'Explorer BPMN XPath integration checks passed';
END
$test$;

ROLLBACK;
