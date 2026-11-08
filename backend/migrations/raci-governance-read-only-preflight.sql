-- RACI governance: read-only PostgreSQL schema preflight
-- Run against the target database with a role that can read PostgreSQL catalogs.
-- This script contains SELECT statements only. It does not inspect business rows,
-- acquire explicit locks, create temporary objects, or modify the database.
--
-- Capture the complete output from all five result sets. Do not include credentials.

-- 1) Server and session context.
SELECT
  current_database() AS database_name,
  current_user AS database_user,
  current_schema() AS current_schema,
  current_setting('server_version') AS server_version,
  current_setting('transaction_isolation') AS transaction_isolation,
  current_setting('search_path') AS search_path,
  now() AS observed_at;

-- 2) Presence and ownership of the relevant relations in every non-system schema.
WITH wanted(name) AS (
  VALUES
    ('projects'),
    ('project_members'),
    ('project_processes'),
    ('project_raci_actors'),
    ('project_raci_entries'),
    ('resources'),
    ('contents'),
    ('process_change_proposals'),
    ('process_change_proposal_events'),
    ('process_change_proposal_comments')
)
SELECT
  w.name AS expected_table,
  n.nspname AS schema_name,
  c.relname AS actual_relation,
  c.relkind AS relation_kind,
  pg_get_userbyid(c.relowner) AS owner
FROM wanted w
LEFT JOIN pg_class c
  ON c.relname = w.name
 AND c.relkind IN ('r', 'p')
LEFT JOIN pg_namespace n
  ON n.oid = c.relnamespace
 AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY w.name, n.nspname;

-- 3) Every foreign key touching a relevant table, including inbound references.
-- confdeltype codes: a=NO ACTION, r=RESTRICT, c=CASCADE, n=SET NULL, d=SET DEFAULT.
WITH wanted(name) AS (
  VALUES
    ('projects'),
    ('project_members'),
    ('project_processes'),
    ('project_raci_actors'),
    ('project_raci_entries'),
    ('resources'),
    ('contents'),
    ('process_change_proposals'),
    ('process_change_proposal_events'),
    ('process_change_proposal_comments')
)
SELECT
  con.conname AS constraint_name,
  src_ns.nspname AS source_schema,
  src.relname AS source_table,
  dst_ns.nspname AS referenced_schema,
  dst.relname AS referenced_table,
  con.convalidated AS is_validated,
  con.condeferrable AS is_deferrable,
  con.condeferred AS initially_deferred,
  con.confdeltype AS delete_action_code,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    ELSE 'UNKNOWN'
  END AS delete_action,
  pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
JOIN pg_class dst ON dst.oid = con.confrelid
JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
WHERE con.contype = 'f'
  AND src_ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND dst_ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND (
    src.relname IN (SELECT name FROM wanted)
    OR dst.relname IN (SELECT name FROM wanted)
  )
ORDER BY src_ns.nspname, src.relname, con.conname;

-- 4) All indexes on the relevant tables, including uniqueness and expressions.
WITH wanted(name) AS (
  VALUES
    ('projects'),
    ('project_members'),
    ('project_processes'),
    ('project_raci_actors'),
    ('project_raci_entries'),
    ('resources'),
    ('contents'),
    ('process_change_proposals'),
    ('process_change_proposal_events'),
    ('process_change_proposal_comments')
)
SELECT
  ns.nspname AS schema_name,
  tbl.relname AS table_name,
  idx.relname AS index_name,
  i.indisprimary AS is_primary,
  i.indisunique AS is_unique,
  i.indisvalid AS is_valid,
  i.indisready AS is_ready,
  pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i
JOIN pg_class tbl ON tbl.oid = i.indrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
JOIN pg_class idx ON idx.oid = i.indexrelid
WHERE tbl.relname IN (SELECT name FROM wanted)
  AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY ns.nspname, tbl.relname, idx.relname;

-- 5) User-defined triggers on relevant tables (internal FK triggers excluded).
WITH wanted(name) AS (
  VALUES
    ('projects'),
    ('project_members'),
    ('project_processes'),
    ('project_raci_actors'),
    ('project_raci_entries'),
    ('resources'),
    ('contents'),
    ('process_change_proposals'),
    ('process_change_proposal_events'),
    ('process_change_proposal_comments')
)
SELECT
  ns.nspname AS schema_name,
  tbl.relname AS table_name,
  trg.tgname AS trigger_name,
  trg.tgenabled AS enabled_state,
  pg_get_triggerdef(trg.oid, true) AS definition
FROM pg_trigger trg
JOIN pg_class tbl ON tbl.oid = trg.tgrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE NOT trg.tgisinternal
  AND tbl.relname IN (SELECT name FROM wanted)
  AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY ns.nspname, tbl.relname, trg.tgname;
