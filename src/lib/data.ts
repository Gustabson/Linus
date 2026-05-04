import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ── Session (wraps auth() — NextAuth already caches, but explicit is safe) ──
export const getSession = cache(auth);

// ── User with theme preferences (used in layout on every request) ─────────
export const getUserTheme = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      themeMode:        true,
      themeBg:          true,
      themeSurface:     true,
      themeBorder:      true,
      themeText:        true,
      themePrimary:     true,
      themeSidebarBg:   true,
      themeSidebarText: true,
      themeKernel:      true,
      themeModule:      true,
      themeResource:    true,
    },
  });
});

// ── User follows (used in feed + profile) ─────────────────────────────────
export const getUserFollows = cache(async (userId: string) => {
  const follows = await prisma.userFollow.findMany({
    where:  { followerId: userId },
    select: { followingId: true },
  });
  return follows.map((f) => f.followingId);
});

// ── User basic info (avatar, name, username — used everywhere) ────────────
export const USER_BASIC_SELECT = {
  id: true, name: true, username: true, image: true,
} as const;

export const getUserBasic = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: USER_BASIC_SELECT,
  });
});
