ALTER TABLE "Message"
ADD COLUMN "purgedBySender" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "purgedByRecipient" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Message_senderId_deletedBySender_purgedBySender_idx"
ON "Message"("senderId", "deletedBySender", "purgedBySender");

CREATE INDEX "Message_recipientId_deletedByRecipient_purgedByRecipient_idx"
ON "Message"("recipientId", "deletedByRecipient", "purgedByRecipient");
