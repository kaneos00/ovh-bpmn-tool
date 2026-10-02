CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE contents_status_enum AS ENUM (
    'obsolete',
    'draft',
    'published'
);

CREATE TYPE resources_type_enum AS ENUM (
    'folder',
    'process'
);

CREATE TABLE resources (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "createdBy" character varying(64) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    depth integer NOT NULL,
    "parentId" character varying,
    "authToken" VARCHAR(64),
    type resources_type_enum NOT NULL
);

CREATE TABLE comments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "createdBy" character varying(64) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "resourceId" uuid NOT NULL,
    comment text NOT NULL,
    "updatedBy" character varying(64) NOT NULL,
    CONSTRAINT "comments_to_resources_fk"
        FOREIGN KEY ("resourceId")
            REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE contents (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "createdBy" character varying(64) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "resourceId" uuid NOT NULL,
    status contents_status_enum NOT NULL,
    version integer,
    content text NOT NULL,
    "pngContent" BYTEA,
    "updatedBy" character varying(64) NOT NULL,
    CONSTRAINT "contents_to_resources_fk"
        FOREIGN KEY ("resourceId")
            REFERENCES resources(id) ON DELETE CASCADE
);

CREATE INDEX ON resources("name");
CREATE INDEX ON comments("resourceId");
CREATE INDEX ON contents("resourceId");


-- Multi-user schema (kept idempotent so existing databases can be upgraded).
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

-- ANCIEN CODE — conservé pour comparaison / retour arrière.
-- Les tables users/user_sessions étaient auparavant absentes de init.sql.
