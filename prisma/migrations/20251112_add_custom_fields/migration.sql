-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'TEXT_AREA', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'EMAIL', 'URL', 'PHONE');

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_fields_entityType_active_idx" ON "custom_fields"("entityType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_key_entityType_key" ON "custom_fields"("key", "entityType");

-- CreateIndex
CREATE INDEX "custom_field_values_entityId_idx" ON "custom_field_values"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_customFieldId_entityId_key" ON "custom_field_values"("customFieldId", "entityId");

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
