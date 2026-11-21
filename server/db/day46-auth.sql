
-- WorkFlow Pro — Day 46
-- Authentication database foundation
-- Existing development database: workflow_pro_dev
-- Preserve all existing users, workspaces, projects and tasks.

BEGIN;

-- 1. Store password hashes for registered accounts.
-- Existing fictional app_users do not automatically receive
-- login credentials.

CREATE TABLE IF NOT EXISTS auth_credentials (
    user_id BIGINT PRIMARY KEY
        REFERENCES app_users(user_id)
        ON DELETE CASCADE,

    password_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);

-- 2. Store login sessions.
-- We never store the original random session token here.
-- The application will store a SHA-256 token hash instead.

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id BIGINT GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES app_users(user_id)
        ON DELETE CASCADE,

    token_hash VARCHAR(64) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT auth_sessions_token_hash_length_check
        CHECK (LENGTH(token_hash) = 64),

    CONSTRAINT auth_sessions_expiry_check
        CHECK (expires_at > created_at)
);

-- Find sessions belonging to a user efficiently.
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
    ON auth_sessions(user_id);

-- Support cleanup of expired sessions.
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry
    ON auth_sessions(expires_at);

COMMIT;

-- Verification: display the newly created tables.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'auth_credentials',
      'auth_sessions'
  )
ORDER BY table_name;

-- Verification: new authentication tables start empty.
SELECT
    (SELECT COUNT(*) FROM auth_credentials)
        AS credential_count,
    (SELECT COUNT(*) FROM auth_sessions)
        AS session_count;

-- Verification: our original business tables still exist.
SELECT
    (SELECT COUNT(*) FROM app_users) AS users,
    (SELECT COUNT(*) FROM workspaces) AS workspaces,
    (SELECT COUNT(*) FROM workspace_memberships)
        AS memberships,
    (SELECT COUNT(*) FROM projects) AS projects,
    (SELECT COUNT(*) FROM tasks) AS tasks;
