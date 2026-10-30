-- PostgreSQL transaction/invariant check for the publication write set.
-- Uses temporary tables that shadow application tables only in this session;
-- no persistent application data is inserted or modified.
\set ON_ERROR_STOP on

CREATE TEMP TABLE resources (
  id text PRIMARY KEY,
  "authToken" text
);
CREATE TEMP TABLE contents (
  id text PRIMARY KEY,
  "resourceId" text NOT NULL REFERENCES resources(id),
  status text NOT NULL,
  version integer NOT NULL,
  "pngContent" text,
  "updatedBy" text
);

INSERT INTO resources (id, "authToken") VALUES ('resource-1', NULL);
INSERT INTO contents (id, "resourceId", status, version, "pngContent", "updatedBy")
VALUES
  ('published-1', 'resource-1', 'published', 1, 'old-image', 'author'),
  ('draft-a', 'resource-1', 'draft', 2, NULL, 'author'),
  ('draft-b', 'resource-1', 'draft', 2, NULL, 'author');

-- A failure after content and token writes must leave the whole write set intact.
DO $$
BEGIN
  BEGIN
    UPDATE contents
       SET status = 'obsolete', "pngContent" = NULL, "updatedBy" = 'publisher'
     WHERE "resourceId" = 'resource-1' AND status = 'published';

    UPDATE contents
       SET status = 'published', "pngContent" = 'new-image', "updatedBy" = 'publisher'
     WHERE id = 'draft-a';

    UPDATE resources SET "authToken" = 'new-token' WHERE id = 'resource-1';

    RAISE EXCEPTION 'forced publication failure';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'forced publication failure' THEN RAISE; END IF;
  END;

  IF (SELECT status FROM contents WHERE id = 'published-1') <> 'published'
     OR (SELECT status FROM contents WHERE id = 'draft-a') <> 'draft'
     OR (SELECT "authToken" FROM resources WHERE id = 'resource-1') IS NOT NULL THEN
    RAISE EXCEPTION 'publication rollback did not restore all rows';
  END IF;
END;
$$;

-- Two drafts created from the same published version must receive distinct
-- published versions when serialized by the parent resource row lock.
DO $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM contents
   WHERE "resourceId" = 'resource-1' AND status IN ('published', 'obsolete');
  UPDATE contents SET status = 'obsolete', "pngContent" = NULL
   WHERE "resourceId" = 'resource-1' AND status = 'published';
  UPDATE contents
     SET status = 'published', version = next_version, "pngContent" = 'image-a'
   WHERE id = 'draft-a';

  SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM contents
   WHERE "resourceId" = 'resource-1' AND status IN ('published', 'obsolete');
  UPDATE contents SET status = 'obsolete', "pngContent" = NULL
   WHERE "resourceId" = 'resource-1' AND status = 'published';
  UPDATE contents
     SET status = 'published', version = next_version, "pngContent" = 'image-b'
   WHERE id = 'draft-b';

  IF (SELECT version FROM contents WHERE id = 'draft-a') <> 2
     OR (SELECT version FROM contents WHERE id = 'draft-b') <> 3
     OR (SELECT count(*) FROM contents WHERE "resourceId" = 'resource-1' AND status = 'published') <> 1
     OR (SELECT version FROM contents WHERE status = 'published') <> 3 THEN
    RAISE EXCEPTION 'published version sequence is inconsistent';
  END IF;
END;
$$;

SELECT 'publication transaction invariants: OK' AS result;
