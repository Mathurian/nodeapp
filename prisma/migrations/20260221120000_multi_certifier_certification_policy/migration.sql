-- Support multi-signer category certifications for each role/user pair
-- and event-level certification requirement overrides.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "requireAllTallyCertifiers" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "requireAllAuditorCertifiers" BOOLEAN;

DROP INDEX IF EXISTS "category_certifications_tenantId_categoryId_role_key";

CREATE UNIQUE INDEX IF NOT EXISTS "category_certifications_tenantId_categoryId_role_userId_key"
  ON "category_certifications"("tenantId", "categoryId", "role", "userId");

