ALTER TABLE app_user_preferences
  ADD COLUMN IF NOT EXISTS home_dashboard_enabled BOOLEAN NOT NULL DEFAULT FALSE;
