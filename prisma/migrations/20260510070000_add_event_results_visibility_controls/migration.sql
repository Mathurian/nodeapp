ALTER TABLE "events"
ADD COLUMN "resultsVisibleRolesOverride" TEXT,
ADD COLUMN "winnersVisibleRolesOverride" TEXT,
ADD COLUMN "progressVisibleRolesOverride" TEXT,
ADD COLUMN "hideResultsUntilEventPublished" BOOLEAN NOT NULL DEFAULT false;
