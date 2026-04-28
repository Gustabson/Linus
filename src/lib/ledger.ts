import { createHash } from "crypto";
import { prisma } from "./prisma";
import type { LedgerEventType } from "@prisma/client";

/**
 * Appends one entry to the append-only audit ledger.
 *
 * The read-then-write is wrapped in a SERIALIZABLE transaction so two
 * concurrent writes cannot both read the same "last" entry and produce
 * a forked/broken chain.
 */
export async function writeLedgerEntry({
  eventType,
  subjectId,
  subjectType,
  eventPayload,
  actorId,
}: {
  eventType:    LedgerEventType;
  subjectId:    string;
  subjectType:  string;
  eventPayload: Record<string, string | number | boolean | null | undefined>;
  actorId:      string;
}) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.ledgerEntry.findFirst({
      orderBy: { id: "desc" },
      select:  { entryHash: true },
    });

    const previousEntryHash = last?.entryHash ?? null;
    const timestamp         = new Date().toISOString();

    const hashInput = [
      eventType,
      subjectId,
      subjectType,
      actorId,
      JSON.stringify(eventPayload),
      timestamp,
      previousEntryHash ?? "genesis",
    ].join("|");

    const entryHash = createHash("sha256").update(hashInput).digest("hex");

    return tx.ledgerEntry.create({
      data: {
        eventType,
        subjectId,
        subjectType,
        eventPayload,
        eventTimestamp:  new Date(timestamp),
        previousEntryHash,
        entryHash,
        actorId,
      },
    });
  }, { isolationLevel: "Serializable" });
}

export async function verifyLedgerChain(): Promise<{
  valid: boolean;
  brokenAt?: number;
}> {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { id: "asc" },
  });

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].previousEntryHash !== entries[i - 1].entryHash) {
      return { valid: false, brokenAt: entries[i].id };
    }
  }

  return { valid: true };
}
