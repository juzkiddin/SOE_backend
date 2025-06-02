-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "mobileNum" TEXT,
ALTER COLUMN "tableId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Otp_mobileNum_idx" ON "Otp"("mobileNum");
