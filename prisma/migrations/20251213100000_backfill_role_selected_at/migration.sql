UPDATE "users"
SET "roleSelectedAt" = "createdAt"
WHERE "roleSelectedAt" IS NULL;
