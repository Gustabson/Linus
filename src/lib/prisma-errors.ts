import { Prisma } from "@prisma/client";

/** Returns true when a serializable transaction should be retried. */
export function isTransactionConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === "P2034";
}
