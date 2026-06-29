-- ==========================================
-- Normy AI Form Validation Platform
-- Supabase Schema DDL Setup
-- ==========================================

-- 1. Custom Enums / Types
CREATE TYPE validation_issue AS ENUM (
  'RANDOM_TEXT',
  'TOO_SHORT',
  'EMPTY',
  'IRRELEVANT_RESPONSE',
  'CONTRADICTORY_RESPONSE',
  'SPAM',
  'LOW_QUALITY',
  'VALID',
  'LOW_CONFIDENCE'
);

CREATE TYPE severity AS ENUM (
  'success',
  'info',
  'warning',
  'error'
);

CREATE TYPE ai_provider AS ENUM (
  'openai',
  'gemini',
  'anthropic',
  'local'
);

CREATE TYPE key_environment AS ENUM (
  'development',
  'production'
);

CREATE TYPE validation_event_type AS ENUM (
  'validation_triggered',
  'validation_completed',
  'token_analytics',
  'feedback_shown',
  'feedback_dismissed',
  'feedback_improved',
  'feedback_ignored',
  'field_focused',
  'field_blurred',
  'form_submitted',
  'form_submit_blocked'
);

CREATE TYPE project_plan AS ENUM (
  'free',
  'pro',
  'enterprise'
);

CREATE TYPE pipeline_stage AS ENUM (
  'local_validator',
  'ai_provider'
);


-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Users Indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users (deleted_at);


-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan project_plan NOT NULL DEFAULT 'free',
  monthly_validation_limit INTEGER DEFAULT 1000,
  monthly_validation_count INTEGER NOT NULL DEFAULT 0,
  default_provider ai_provider NOT NULL DEFAULT 'gemini',
  settings JSONB NOT NULL DEFAULT '{
    "minScore": 50,
    "defaultProvider": "gemini",
    "defaultValidationMode": "onPause",
    "pauseDelayMs": 2000,
    "storeInputText": true,
    "shieldEnabled": false
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Projects Indexes
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_slug_unique_idx ON projects (user_id, slug);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id);
CREATE INDEX IF NOT EXISTS projects_is_active_idx ON projects (is_active);
CREATE INDEX IF NOT EXISTS projects_deleted_at_idx ON projects (deleted_at);


-- 4. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  environment key_environment NOT NULL DEFAULT 'development',
  rate_limit INTEGER DEFAULT 60,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoke_reason TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- API Keys Indexes
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_unique_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_project_id_idx ON api_keys (project_id);
CREATE INDEX IF NOT EXISTS api_keys_revoked_at_idx ON api_keys (revoked_at);
CREATE INDEX IF NOT EXISTS api_keys_expires_at_idx ON api_keys (expires_at);


-- 5. Validations Table (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys (id) ON DELETE SET NULL,
  question TEXT,
  answer TEXT,
  field_context TEXT,
  issue validation_issue NOT NULL,
  score INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  severity severity NOT NULL,
  valid BOOLEAN NOT NULL,
  pipeline_stage pipeline_stage NOT NULL,
  resolved_by TEXT NOT NULL,
  provider ai_provider,
  model TEXT,
  latency_ms INTEGER NOT NULL,
  token_count INTEGER,
  confidence REAL NOT NULL DEFAULT 1.0,
  ip_address_hash TEXT,
  user_agent TEXT,
  metadata JSONB,
  prompt_version TEXT NOT NULL DEFAULT 'quality-v1',
  score_before INTEGER,
  score_after INTEGER,
  improvement_delta INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Checks
  CONSTRAINT validations_score_range CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT validations_latency_positive CHECK (latency_ms >= 0),
  CONSTRAINT validations_token_count_positive CHECK (token_count IS NULL OR token_count >= 0),
  CONSTRAINT validations_confidence_range CHECK (confidence BETWEEN 0.0 AND 1.0)
);

-- Validations Indexes
CREATE INDEX IF NOT EXISTS validations_project_created_idx ON validations (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS validations_project_issue_idx ON validations (project_id, issue);
CREATE INDEX IF NOT EXISTS validations_project_valid_idx ON validations (project_id, valid);
CREATE INDEX IF NOT EXISTS validations_project_provider_idx ON validations (project_id, provider);
CREATE INDEX IF NOT EXISTS validations_api_key_id_idx ON validations (api_key_id);
CREATE INDEX IF NOT EXISTS validations_created_at_idx ON validations (created_at);


-- 6. Validation Events Table (SDK Interactions Log)
CREATE TABLE IF NOT EXISTS validation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID REFERENCES validations (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  type validation_event_type NOT NULL,
  session_id TEXT,
  field_name TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation Events Indexes
CREATE INDEX IF NOT EXISTS val_events_validation_id_idx ON validation_events (validation_id);
CREATE INDEX IF NOT EXISTS val_events_project_created_idx ON validation_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS val_events_session_id_idx ON validation_events (session_id);
CREATE INDEX IF NOT EXISTS val_events_type_idx ON validation_events (type);
CREATE INDEX IF NOT EXISTS val_events_created_at_idx ON validation_events (created_at);


-- 7. Analytics Daily Table (Daily pre-aggregated rollups)
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_validations INTEGER NOT NULL DEFAULT 0,
  valid_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  local_short_circuit_count INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2),
  p50_score NUMERIC(5,2),
  avg_latency_ms INTEGER,
  p50_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  total_tokens_consumed INTEGER NOT NULL DEFAULT 0,
  issue_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  toast_shown_count INTEGER NOT NULL DEFAULT 0,
  toast_dismissed_by_user_count INTEGER NOT NULL DEFAULT 0,
  toast_auto_dismissed_count INTEGER NOT NULL DEFAULT 0,
  form_submit_blocked_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Checks
  CONSTRAINT analytics_daily_valid_lte_total CHECK (valid_count <= total_validations),
  CONSTRAINT analytics_daily_invalid_lte_total CHECK (invalid_count <= total_validations)
);

-- Analytics Daily Indexes
CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_project_date_unique_idx ON analytics_daily (project_id, date);
CREATE INDEX IF NOT EXISTS analytics_daily_project_date_idx ON analytics_daily (project_id, date);
CREATE INDEX IF NOT EXISTS analytics_daily_date_idx ON analytics_daily (date);


-- 8. Provider Configurations Table
CREATE TABLE IF NOT EXISTS provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  provider ai_provider NOT NULL,
  model TEXT,
  api_key_encrypted TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  temperature NUMERIC(3,2) DEFAULT 0.20,
  max_tokens INTEGER DEFAULT 512,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  max_retries INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Checks
  CONSTRAINT provider_configs_temperature_range CHECK (temperature IS NULL OR (temperature >= 0 AND temperature <= 2)),
  CONSTRAINT provider_configs_timeout_positive CHECK (timeout_ms > 0),
  CONSTRAINT provider_configs_retries_range CHECK (max_retries >= 0 AND max_retries <= 10)
);

-- Provider Configurations Indexes
CREATE UNIQUE INDEX IF NOT EXISTS provider_configs_project_provider_unique_idx ON provider_configs (project_id, provider);
CREATE INDEX IF NOT EXISTS provider_configs_project_id_idx ON provider_configs (project_id);
CREATE INDEX IF NOT EXISTS provider_configs_is_default_idx ON provider_configs (is_default);
