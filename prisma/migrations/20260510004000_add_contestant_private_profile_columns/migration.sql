ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "contestantAccommodations" TEXT,
  ADD COLUMN IF NOT EXISTS "contestantPrivateDocuments" JSONB,
  ADD COLUMN IF NOT EXISTS "contestantPrivateNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "contestantRecommendationNotes" TEXT;
