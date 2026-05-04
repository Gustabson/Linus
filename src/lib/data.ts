// ── Shared Prisma selects — single source of truth ─────────────────────────

/** User fields used everywhere: avatar, name, username. Spread in Prisma selects. */
export const USER_BASIC_SELECT = {
  id: true, name: true, username: true, image: true,
} as const;
