CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL,
 full_name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
 onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS entities (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_name TEXT NOT NULL,
 created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 data JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entities_owner_idx ON entities(created_by_id, entity_name);
CREATE INDEX IF NOT EXISTS entities_name_idx ON entities(entity_name);
CREATE TABLE IF NOT EXISTS audit_log (id BIGSERIAL PRIMARY KEY, actor_id UUID, action TEXT NOT NULL, target_user_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
