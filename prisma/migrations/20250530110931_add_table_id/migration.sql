/*
  Warnings:

  - Added the required column `tableId` to the `Otp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "tableId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Otp_tableId_idx" ON "Otp"("tableId");
