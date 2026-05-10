CREATE TYPE "CommentaryScope" AS ENUM ('CATEGORY', 'CONTEST', 'EVENT');

ALTER TABLE "categories"
ADD COLUMN "commentaryScope" "CommentaryScope" NOT NULL DEFAULT 'CATEGORY';

ALTER TABLE "category_templates"
ADD COLUMN "commentaryScope" "CommentaryScope" NOT NULL DEFAULT 'CATEGORY';

ALTER TABLE "judge_comments"
ADD COLUMN "scope" "CommentaryScope" NOT NULL DEFAULT 'CATEGORY',
ADD COLUMN "scopeKey" TEXT,
ADD COLUMN "contestId" TEXT,
ADD COLUMN "eventId" TEXT;

UPDATE "judge_comments" jc
SET
  "scopeKey" = CONCAT('category:', jc."categoryId"),
  "contestId" = c."contestId",
  "eventId" = ct."eventId"
FROM "categories" c
JOIN "contests" ct ON ct."id" = c."contestId"
WHERE jc."categoryId" = c."id";

ALTER TABLE "judge_comments"
ALTER COLUMN "scopeKey" SET NOT NULL,
ALTER COLUMN "categoryId" DROP NOT NULL;

ALTER TABLE "judge_comments"
DROP CONSTRAINT IF EXISTS "judge_comments_tenantId_categoryId_contestantId_judgeId_key";

ALTER TABLE "judge_comments"
ADD CONSTRAINT "judge_comments_contestId_fkey"
FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "judge_comments"
ADD CONSTRAINT "judge_comments_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "judge_comments_tenantId_scope_scopeKey_contestantId_judgeId_key"
ON "judge_comments"("tenantId", "scope", "scopeKey", "contestantId", "judgeId");

CREATE INDEX "judge_comments_tenantId_scope_scopeKey_idx"
ON "judge_comments"("tenantId", "scope", "scopeKey");

CREATE INDEX "judge_comments_tenantId_contestId_idx"
ON "judge_comments"("tenantId", "contestId");

CREATE INDEX "judge_comments_tenantId_eventId_idx"
ON "judge_comments"("tenantId", "eventId");

CREATE INDEX "judge_comments_scope_scopeKey_contestantId_judgeId_idx"
ON "judge_comments"("scope", "scopeKey", "contestantId", "judgeId");
