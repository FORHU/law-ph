-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "parentMessageId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_parentMessageId_idx" ON "Message"("parentMessageId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_parentMessageId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_parentMessageId_fkey"
      FOREIGN KEY ("parentMessageId")
      REFERENCES "Message"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
