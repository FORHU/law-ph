-- Invite security hardening:
-- 1. Remove unique constraint so links can be rotated (new link invalidates old one)
-- 2. Add expiresAt (5-min TTL) — multi-use within the window
-- 3. Expire all existing invite links immediately

ALTER TABLE "ConversationInvite" DROP CONSTRAINT IF EXISTS "ConversationInvite_conversationId_key";

ALTER TABLE "ConversationInvite" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Existing links expire immediately
UPDATE "ConversationInvite" SET "expiresAt" = NOW();

ALTER TABLE "ConversationInvite" ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "ConversationInvite_conversationId_idx" ON "ConversationInvite"("conversationId");
