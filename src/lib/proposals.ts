export function proposalCounterpartyId({
  authorId,
  targetOwnerId,
  currentUserId,
}: {
  authorId: string;
  targetOwnerId: string;
  currentUserId: string;
}): string | null {
  if (currentUserId === authorId) return targetOwnerId;
  if (currentUserId === targetOwnerId) return authorId;
  return null;
}
