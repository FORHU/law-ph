-- AlterTable
ALTER TABLE "events" ADD COLUMN     "reminder_day_before_sent_at" TIMESTAMP(3),
ADD COLUMN     "reminder_day_of_sent_at" TIMESTAMP(3);
