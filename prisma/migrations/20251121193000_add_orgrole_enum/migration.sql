-- Create OrgRole enum and alter organization_members.roleInOrg to use it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'OrgRole'
  ) THEN
    CREATE TYPE "OrgRole" AS ENUM ('OWNER','ADMIN','TEACHER','STUDENT','PARENT');
  END IF;
END$$;

ALTER TABLE "organization_members"
  ALTER COLUMN "roleInOrg" TYPE "OrgRole" USING (
    CASE WHEN "roleInOrg" IS NULL THEN NULL ELSE "roleInOrg"::"OrgRole" END
  );
