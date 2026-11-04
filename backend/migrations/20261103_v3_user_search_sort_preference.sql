ALTER TABLE app_user_preferences
  ADD COLUMN IF NOT EXISTS search_sort JSONB;
