import { Prisma } from "@prisma/client";

/** Supports rolling deployments while an additive schema change is being applied. */
export function isMissingDatabaseColumn(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
}
