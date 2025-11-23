-- CreateTable
CREATE TABLE "TallyMasterAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "contestId" TEXT,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TallyMasterAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditorAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "contestId" TEXT,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "AuditorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TallyMasterAssignment_tenantId_idx" ON "TallyMasterAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "TallyMasterAssignment_userId_idx" ON "TallyMasterAssignment"("userId");

-- CreateIndex
CREATE INDEX "TallyMasterAssignment_eventId_idx" ON "TallyMasterAssignment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TallyMasterAssignment_tenantId_userId_categoryId_key" ON "TallyMasterAssignment"("tenantId", "userId", "categoryId");

-- CreateIndex
CREATE INDEX "AuditorAssignment_tenantId_idx" ON "AuditorAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "AuditorAssignment_userId_idx" ON "AuditorAssignment"("userId");

-- CreateIndex
CREATE INDEX "AuditorAssignment_eventId_idx" ON "AuditorAssignment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditorAssignment_tenantId_userId_categoryId_key" ON "AuditorAssignment"("tenantId", "userId", "categoryId");

-- AddForeignKey
ALTER TABLE "TallyMasterAssignment" ADD CONSTRAINT "TallyMasterAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyMasterAssignment" ADD CONSTRAINT "TallyMasterAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyMasterAssignment" ADD CONSTRAINT "TallyMasterAssignment_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyMasterAssignment" ADD CONSTRAINT "TallyMasterAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyMasterAssignment" ADD CONSTRAINT "TallyMasterAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorAssignment" ADD CONSTRAINT "AuditorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorAssignment" ADD CONSTRAINT "AuditorAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorAssignment" ADD CONSTRAINT "AuditorAssignment_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorAssignment" ADD CONSTRAINT "AuditorAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorAssignment" ADD CONSTRAINT "AuditorAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
