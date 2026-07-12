-- Additive, idempotent rollout for rich comments and threaded conversations.
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "attachmentType" TEXT;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "linkedTreeId" TEXT;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "PostComment_linkedTreeId_idx" ON "PostComment"("linkedTreeId");
CREATE INDEX IF NOT EXISTS "PostComment_parentId_idx" ON "PostComment"("parentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostComment_linkedTreeId_fkey') THEN
    ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_linkedTreeId_fkey"
      FOREIGN KEY ("linkedTreeId") REFERENCES "DocumentTree"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostComment_parentId_fkey') THEN
    ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PostCommentLike" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "PostCommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostCommentLike_commentId_userId_key" ON "PostCommentLike"("commentId", "userId");
CREATE INDEX IF NOT EXISTS "PostCommentLike_commentId_idx" ON "PostCommentLike"("commentId");
CREATE INDEX IF NOT EXISTS "PostCommentLike_userId_idx" ON "PostCommentLike"("userId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostCommentLike_commentId_fkey') THEN
    ALTER TABLE "PostCommentLike" ADD CONSTRAINT "PostCommentLike_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostCommentLike_userId_fkey') THEN
    ALTER TABLE "PostCommentLike" ADD CONSTRAINT "PostCommentLike_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
