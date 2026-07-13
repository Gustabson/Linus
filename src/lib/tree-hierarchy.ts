import type { ContentType } from "@prisma/client";

/** The only valid parent-child relationships between educational trees. */
export function canAttachTree(container: ContentType, child: ContentType): boolean {
  if (container === "KERNEL") return child === "MODULE" || child === "RESOURCE";
  if (container === "MODULE") return child === "RESOURCE";
  return false;
}
