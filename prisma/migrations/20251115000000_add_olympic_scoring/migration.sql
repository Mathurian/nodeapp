-- CreateEnum
CREATE TYPE "ScoringType" AS ENUM ('STRAIGHT', 'OLYMPIC');

-- AlterTable Tenant - Add scoringType column with default STRAIGHT
ALTER TABLE "tenants" ADD COLUMN "scoringType" "ScoringType" NOT NULL DEFAULT 'STRAIGHT';

-- AlterTable Event - Add optional scoringType column
ALTER TABLE "events" ADD COLUMN "scoringType" "ScoringType";

-- AlterTable Contest - Add optional scoringType column
ALTER TABLE "contests" ADD COLUMN "scoringType" "ScoringType";
