-- Add the column as nullable first
ALTER TABLE "Otp" ADD COLUMN "clientId" TEXT;

-- Update existing rows with a default value
UPDATE "Otp" SET "clientId" = gen_random_uuid();

-- Now alter the column to be non-nullable
ALTER TABLE "Otp" ALTER COLUMN "clientId" SET NOT NULL;

-- Create the index
CREATE INDEX "Otp_clientId_idx" ON "Otp"("clientId");