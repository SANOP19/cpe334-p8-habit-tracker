-- Lab 7 CR #99: entry correction with revision history (F-04 v1.2 §3).
-- Additive only: existing entries get version 0 and updatedAt NULL; no data is rewritten.

-- AlterTable
ALTER TABLE "activity_entries" ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "activity_entry_revisions" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "previousValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "previousNote" TEXT,
    "newNote" TEXT,
    "reason" TEXT NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_entry_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_entry_revisions_entryId_changedAt_idx" ON "activity_entry_revisions"("entryId", "changedAt");

-- AddForeignKey
ALTER TABLE "activity_entry_revisions" ADD CONSTRAINT "activity_entry_revisions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "activity_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_entry_revisions" ADD CONSTRAINT "activity_entry_revisions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

