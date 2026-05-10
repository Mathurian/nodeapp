CREATE TYPE "CommentaryMode" AS ENUM ('PER_CRITERION', 'PER_CATEGORY', 'HYBRID');

ALTER TABLE "categories"
ADD COLUMN "commentaryMode" "CommentaryMode" NOT NULL DEFAULT 'PER_CRITERION';

ALTER TABLE "category_templates"
ADD COLUMN "commentaryMode" "CommentaryMode" NOT NULL DEFAULT 'PER_CRITERION';
