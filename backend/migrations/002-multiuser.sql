-- Multi-user profiles and sessions.
-- Consultation = read-only.
-- Consultation + modification = read/write on process content.
-- Administration is reserved for user/profile administration.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role_enum'
    ) THEN
        CREATE TYPE user_role_enum AS ENUM ('consultation', 'editor', 'admin');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    username character varying(128) NOT NULL UNIQUE,
    "displayName" character varying(255) NOT NULL,
    "passwordHash" text NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'consultation',
    enabled boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "userId" uuid NOT NULL,
    "tokenHash" text NOT NULL UNIQUE,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    CONSTRAINT "user_sessions_to_users_fk"
        FOREIGN KEY ("userId")
            REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS users_username_idx ON users("username");
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions("userId");
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions("expiresAt");
