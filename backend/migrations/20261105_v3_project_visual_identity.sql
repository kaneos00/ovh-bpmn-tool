ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS color character varying(7) NOT NULL DEFAULT '#2864d7',
  ADD COLUMN IF NOT EXISTS icon character varying(32) NOT NULL DEFAULT 'folder';
