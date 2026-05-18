-- AlterTable
ALTER TABLE "events" ADD COLUMN     "last_reminder_sent_at" TIMESTAMP(3),
ADD COLUMN     "lawyer_acknowledged_at" TIMESTAMP(3);
