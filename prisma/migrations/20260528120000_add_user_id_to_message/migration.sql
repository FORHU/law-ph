-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_userId_idx" ON "Message"("userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_userId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
