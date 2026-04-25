import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationArgs {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  link: string;
}

/**
 * Creates a notification. No-ops silently if:
 * - actor and recipient are the same person
 * - any DB error occurs (notifications are non-critical)
 */
export async function createNotification({
  type,
  recipientId,
  actorId,
  link,
}: CreateNotificationArgs): Promise<void> {
  if (recipientId === actorId) return;
  try {
    await prisma.notification.create({
      data: { type, recipientId, actorId, link },
    });
  } catch {
    // swallow — notifications must never break the main action
  }
}
