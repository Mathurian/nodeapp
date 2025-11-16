-- Create category_certifications table
CREATE TABLE IF NOT EXISTS "category_certifications" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureName" TEXT,
    "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "category_certifications_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for category and role combination
CREATE UNIQUE INDEX IF NOT EXISTS "category_certifications_categoryId_role_key" ON "category_certifications"("categoryId", "role");

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'category_certifications_categoryId_fkey' 
        AND table_name = 'category_certifications'
    ) THEN
        ALTER TABLE "category_certifications" ADD CONSTRAINT "category_certifications_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'category_certifications_userId_fkey' 
        AND table_name = 'category_certifications'
    ) THEN
        ALTER TABLE "category_certifications" ADD CONSTRAINT "category_certifications_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "category_certifications_categoryId_idx" ON "category_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "category_certifications_userId_idx" ON "category_certifications"("userId");

