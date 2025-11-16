-- Add Notification System
-- Migration: 20251112_add_notification_system
-- Description: Adds notification system with real-time support

-- Rename notifications field in users table to avoid conflict
ALTER TABLE "users" RENAME COLUMN "notifications" TO "notificationSettings";

-- Create NotificationType enum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM');

-- Create notifications table
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create indexes for optimal query performance
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- Add foreign key constraint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comment
COMMENT ON TABLE "notifications" IS 'System notifications for users';
