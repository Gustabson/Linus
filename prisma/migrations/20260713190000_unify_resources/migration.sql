-- Resources now cover editable documents as well as links, apps, media,
-- files and references. Existing TreeExtension rows become real resources.
BEGIN;

CREATE TYPE "ResourceKind" AS ENUM ('EDITOR', 'LINK', 'APP', 'IMAGE', 'VIDEO', 'FILE', 'REFERENCE');

ALTER TABLE "DocumentTree"
  ADD COLUMN "resourceKind" "ResourceKind",
  ADD COLUMN "resourceUrl" TEXT;

UPDATE "DocumentTree"
SET "resourceKind" = 'EDITOR'
WHERE "contentType" = 'RESOURCE';

INSERT INTO "DocumentTree" (
  "id", "slug", "title", "description", "language", "visibility",
  "contentType", "resourceKind", "resourceUrl", "forkDepth",
  "createdAt", "updatedAt", "ownerId"
)
SELECT
  'legacy_resource_' || extension."id",
  'recurso-legacy-' || extension."id",
  extension."title",
  extension."description",
  'es',
  parent."visibility",
  'RESOURCE',
  CASE extension."type"::text
    WHEN 'LINK' THEN 'LINK'::"ResourceKind"
    WHEN 'APP' THEN 'APP'::"ResourceKind"
    WHEN 'IMAGE' THEN 'IMAGE'::"ResourceKind"
    WHEN 'VIDEO' THEN 'VIDEO'::"ResourceKind"
    WHEN 'FILE' THEN 'FILE'::"ResourceKind"
    ELSE 'REFERENCE'::"ResourceKind"
  END,
  COALESCE(extension."url", extension."imageUrl"),
  0,
  extension."createdAt",
  extension."updatedAt",
  extension."authorId"
FROM "TreeExtension" extension
JOIN "DocumentTree" parent ON parent."id" = extension."treeId";

INSERT INTO "TreeMembership" ("id", "role", "createdAt", "treeId", "userId")
SELECT
  'legacy_membership_' || extension."id",
  'OWNER',
  extension."createdAt",
  'legacy_resource_' || extension."id",
  extension."authorId"
FROM "TreeExtension" extension;

INSERT INTO "TreeAttachment" ("id", "addedAt", "kernelId", "contentId", "addedById")
SELECT
  'legacy_attachment_' || extension."id",
  extension."createdAt",
  extension."treeId",
  'legacy_resource_' || extension."id",
  extension."authorId"
FROM "TreeExtension" extension
JOIN "DocumentTree" parent ON parent."id" = extension."treeId"
WHERE parent."contentType" IN ('KERNEL', 'MODULE')
ON CONFLICT ("kernelId", "contentId") DO NOTHING;

DROP TABLE "TreeExtension";
DROP TYPE "ExtensionType";

CREATE INDEX "DocumentTree_contentType_resourceKind_idx"
  ON "DocumentTree"("contentType", "resourceKind");

COMMIT;
