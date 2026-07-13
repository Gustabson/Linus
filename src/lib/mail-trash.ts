export type MailDeletionScope = "sender" | "recipient" | "both";
export type MailOrigin = "bandeja" | "enviados" | "borradores";

export function resolveMailScope(
  requestedScope: MailDeletionScope | null,
  isSender: boolean,
  isRecipient: boolean,
): { affectSender: boolean; affectRecipient: boolean } | null {
  const affectSender = requestedScope
    ? requestedScope === "sender" || requestedScope === "both"
    : isSender;
  const affectRecipient = requestedScope
    ? requestedScope === "recipient" || requestedScope === "both"
    : isRecipient;

  if ((affectSender && !isSender) || (affectRecipient && !isRecipient)) return null;
  return { affectSender, affectRecipient };
}

interface TrashState {
  senderId: string;
  recipientId: string | null;
  isDraft: boolean;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  purgedBySender: boolean;
  purgedByRecipient: boolean;
}

/**
 * Resolves which side of a message is represented by one trash row.
 * A user can be both sender and recipient, so role alone is not enough.
 */
export function getTrashPresentation(message: TrashState, userId: string): {
  scope: MailDeletionScope;
  origin: MailOrigin;
} | null {
  const deletedAsSender = message.senderId === userId
    && message.deletedBySender
    && !message.purgedBySender;
  const deletedAsRecipient = message.recipientId === userId
    && message.deletedByRecipient
    && !message.purgedByRecipient;

  if (!deletedAsSender && !deletedAsRecipient) return null;

  const scope: MailDeletionScope = deletedAsSender && deletedAsRecipient
    ? "both"
    : deletedAsSender ? "sender" : "recipient";
  const origin: MailOrigin = message.isDraft
    ? "borradores"
    : deletedAsRecipient && !deletedAsSender ? "bandeja" : "enviados";

  return { scope, origin };
}
