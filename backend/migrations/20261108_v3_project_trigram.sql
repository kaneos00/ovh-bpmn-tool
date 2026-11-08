ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS trigram character varying(3);
