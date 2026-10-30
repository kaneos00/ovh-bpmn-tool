-- Read-only diagnostic for the explorer metadata query.
-- Run against a representative staging database with:
--   psql -v ON_ERROR_STOP=1 -f backend/tests/sql/explorer-performance.diagnostic.sql
-- Review execution time, buffers, row estimates and index usage before adding indexes.

\echo '=== Contents table size and status distribution ==='
SELECT
  status,
  count(*) AS rows,
  pg_size_pretty(sum(pg_column_size(content))::bigint) AS xml_payload_size
FROM contents
GROUP BY status
ORDER BY status;

\echo '=== Existing indexes and definitions ==='
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename IN ('contents', 'resources')
ORDER BY tablename, indexname;

\echo '=== Index usage statistics (since last statistics reset) ==='
SELECT
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = current_schema()
  AND relname IN ('contents', 'resources')
ORDER BY relname, indexrelname;

\echo '=== Explorer query plan: latest published content and XML metadata extraction ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
WITH target_resources AS MATERIALIZED (
  SELECT id
  FROM resources
  WHERE type = 'process'
  ORDER BY id
  LIMIT 50
),
latest_published AS (
  SELECT DISTINCT ON (c."resourceId")
    c."resourceId",
    c.content
  FROM contents c
  JOIN target_resources r ON r.id = c."resourceId"
  WHERE c.status = 'published'
  ORDER BY c."resourceId", c.version DESC NULLS LAST, c."createdAt" DESC
)
SELECT
  "resourceId",
  xpath('//*[local-name()="process"]/@id', content::xml) AS process_ids,
  xpath('//*[local-name()="callActivity"]/@calledElement', content::xml) AS call_targets,
  xpath('//*[local-name()="subProcess" and @id = //*[local-name()="BPMNShape" and @isExpanded="false"]/@bpmnElement]/@id', content::xml) AS collapsed_targets
FROM latest_published;
