DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationSeverity') THEN
    CREATE TYPE "NotificationSeverity" AS ENUM ('INFO','WARNING','CRITICAL');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" VARCHAR(80),
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "actionUrl" VARCHAR(1000),
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "dedupeKey" VARCHAR(200),
  "meta" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_userId_dedupeKey_key" ON "notifications"("userId", "dedupeKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_userId_fkey'
  ) THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

INSERT INTO "notifications" (
  "id",
  "userId",
  "type",
  "title",
  "description",
  "actionUrl",
  "severity",
  "dedupeKey",
  "meta",
  "read",
  "readAt",
  "createdAt",
  "updatedAt"
)
SELECT
  (elem->>'id') as "id",
  split_part(ss."key", ':', 2) as "userId",
  NULLIF(elem->>'type', '') as "type",
  COALESCE(NULLIF(elem->>'title', ''), 'Notification') as "title",
  NULLIF(elem->>'description', '') as "description",
  NULLIF(elem->>'actionUrl', '') as "actionUrl",
  CASE
    WHEN (elem->>'severity') IN ('INFO','WARNING','CRITICAL') THEN (elem->>'severity')::"NotificationSeverity"
    ELSE 'INFO'::"NotificationSeverity"
  END as "severity",
  NULLIF(elem->>'dedupeKey', '') as "dedupeKey",
  elem->'meta' as "meta",
  COALESCE((elem->>'read')::boolean, false) as "read",
  NULL as "readAt",
  CASE
    WHEN (elem->>'createdAt') ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN (elem->>'createdAt')::timestamptz
    ELSE CURRENT_TIMESTAMP
  END as "createdAt",
  CASE
    WHEN (elem->>'createdAt') ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN (elem->>'createdAt')::timestamptz
    ELSE CURRENT_TIMESTAMP
  END as "updatedAt"
FROM "system_settings" ss
CROSS JOIN LATERAL jsonb_array_elements(ss."value") elem
WHERE ss."key" LIKE 'notifications:%'
  AND jsonb_typeof(ss."value") = 'array'
  AND (elem ? 'id')
  AND length(elem->>'id') > 0
  AND split_part(ss."key", ':', 2) <> ''
ON CONFLICT DO NOTHING;
