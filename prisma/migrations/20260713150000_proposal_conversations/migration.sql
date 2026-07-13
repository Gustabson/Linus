-- Replace proposal merges with private, content-linked conversations while
-- retaining historical proposal rows.
ALTER TABLE "ChangeProposal"
  ALTER COLUMN "sourceTreeId" DROP NOT NULL,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "authorUnread" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recipientUnread" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "targetDocumentId" TEXT;

-- Historical proposals must not prevent deleting their old fork, while the
-- conversation itself belongs to the target content and disappears with it.
ALTER TABLE "ChangeProposal" DROP CONSTRAINT "ChangeProposal_sourceTreeId_fkey";
ALTER TABLE "ChangeProposal" DROP CONSTRAINT "ChangeProposal_targetTreeId_fkey";
ALTER TABLE "ChangeProposal"
  ADD CONSTRAINT "ChangeProposal_sourceTreeId_fkey"
  FOREIGN KEY ("sourceTreeId") REFERENCES "DocumentTree"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChangeProposal"
  ADD CONSTRAINT "ChangeProposal_targetTreeId_fkey"
  FOREIGN KEY ("targetTreeId") REFERENCES "DocumentTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProposalMessage" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "proposalId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  CONSTRAINT "ProposalMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChangeProposal_targetDocumentId_idx" ON "ChangeProposal"("targetDocumentId");
CREATE INDEX "ChangeProposal_targetTreeId_updatedAt_idx" ON "ChangeProposal"("targetTreeId", "updatedAt");
CREATE INDEX "ChangeProposal_authorId_updatedAt_idx" ON "ChangeProposal"("authorId", "updatedAt");
CREATE INDEX "ChangeProposal_targetTreeId_recipientUnread_idx" ON "ChangeProposal"("targetTreeId", "recipientUnread");
CREATE INDEX "ProposalMessage_proposalId_createdAt_idx" ON "ProposalMessage"("proposalId", "createdAt");
CREATE INDEX "ProposalMessage_senderId_idx" ON "ProposalMessage"("senderId");

ALTER TABLE "ChangeProposal"
  ADD CONSTRAINT "ChangeProposal_targetDocumentId_fkey"
  FOREIGN KEY ("targetDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProposalMessage"
  ADD CONSTRAINT "ProposalMessage_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "ChangeProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalMessage"
  ADD CONSTRAINT "ProposalMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
