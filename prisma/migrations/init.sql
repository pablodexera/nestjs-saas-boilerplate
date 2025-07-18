-- ENUMS
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER', 'ADMIN');

-- USERS
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" VARCHAR UNIQUE NOT NULL,
  "full_name" VARCHAR,
  "avatar_url" VARCHAR,
  "is_global_admin" BOOLEAN NOT NULL DEFAULT false,
  "primary_workspace_id" UUID,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_login_at" TIMESTAMP,
  "social_provider" VARCHAR,
  "country" VARCHAR,
  "is_disabled" BOOLEAN NOT NULL DEFAULT false
);

-- WORKSPACES
CREATE TABLE "workspaces" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" VARCHAR NOT NULL,
  "slug" VARCHAR UNIQUE NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMP,
  "owner_id" UUID,
  "settings_json" JSONB,
  CONSTRAINT fk_workspace_owner FOREIGN KEY ("owner_id") REFERENCES "users"("id")
);

-- USER_WORKSPACES
CREATE TABLE "user_workspaces" (
  "user_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "invited_by" UUID,
  "joined_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "status" VARCHAR NOT NULL DEFAULT 'active',
  "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
  PRIMARY KEY ("user_id", "workspace_id"),
  CONSTRAINT fk_uw_user FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT fk_uw_workspace FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id"),
  CONSTRAINT fk_uw_invited_by FOREIGN KEY ("invited_by") REFERENCES "users"("id")
);

-- SUBSCRIPTIONS
CREATE TABLE "subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" UUID UNIQUE NOT NULL,
  "plan" VARCHAR NOT NULL,
  "billing_period" VARCHAR NOT NULL,
  "status" VARCHAR NOT NULL,
  "current_period_start" TIMESTAMP NOT NULL,
  "current_period_end" TIMESTAMP NOT NULL,
  "trial_end" TIMESTAMP,
  "seats" INT NOT NULL DEFAULT 1,
  "record_limit" INT,
  "stripe_id" VARCHAR,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sub_workspace FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
);

-- GUEST_TOKENS
CREATE TABLE "guest_tokens" (
  "token" VARCHAR PRIMARY KEY NOT NULL,
  "workspace_id" UUID,
  "issued_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "permissions" JSONB,
  "usage_count" INT NOT NULL DEFAULT 0,
  "max_usage" INT,
  CONSTRAINT fk_gt_workspace FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
);

-- AUDIT_EVENTS
CREATE TABLE "audit_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" VARCHAR NOT NULL,
  "actor_id" UUID,
  "workspace_id" UUID,
  "details" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_actor FOREIGN KEY ("actor_id") REFERENCES "users"("id"),
  CONSTRAINT fk_audit_workspace FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
);

-- NOTIFICATIONS
CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" UUID NOT NULL,
  "type" VARCHAR NOT NULL,
  "payload" JSONB,
  "sent_via" VARCHAR,
  "sent_at" TIMESTAMP,
  "read_at" TIMESTAMP,
  "dismissed_at" TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

-- FILES
CREATE TABLE "files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "file_name" VARCHAR NOT NULL,
  "file_path" VARCHAR NOT NULL,
  "url" VARCHAR,
  "mime_type" VARCHAR,
  "size_bytes" INT,
  "uploaded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "metadata" JSONB,
  CONSTRAINT fk_file_user FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT fk_file_workspace FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
);

-- TEST_SESSIONS
CREATE TABLE "TestSessionToken" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" VARCHAR UNIQUE NOT NULL,
  "token" VARCHAR NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "clerk_id" VARCHAR NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RELATION: users.primary_workspace_id references workspaces(id)
ALTER TABLE "users"
  ADD CONSTRAINT fk_user_primary_workspace FOREIGN KEY ("primary_workspace_id") REFERENCES "workspaces"("id");

