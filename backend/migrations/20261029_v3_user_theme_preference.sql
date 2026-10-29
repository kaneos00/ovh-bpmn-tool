CREATE TABLE IF NOT EXISTS app_user_preferences (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL CHECK (theme IN ('light', 'dark')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);