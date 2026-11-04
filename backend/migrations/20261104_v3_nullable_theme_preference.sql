-- Search-sort preferences must not implicitly assign a visual theme.
-- A NULL theme means the account has not explicitly selected one yet.
ALTER TABLE app_user_preferences
  ALTER COLUMN theme DROP NOT NULL;
