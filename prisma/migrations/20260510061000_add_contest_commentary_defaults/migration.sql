ALTER TABLE "contests"
ADD COLUMN "commentaryMode" "CommentaryMode" NOT NULL DEFAULT 'PER_CRITERION',
ADD COLUMN "commentaryScope" "CommentaryScope" NOT NULL DEFAULT 'CATEGORY';
