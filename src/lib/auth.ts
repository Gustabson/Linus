import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // Providers are conditional — only active when credentials are configured
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({
          clientId:     process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          // allowDangerousEmailAccountLinking removed (S4):
          // enables account takeover via email collision across providers
        })]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [GitHub({
          clientId:     process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
        })]
      : []),
    // Credentials provider removed (B2/S6):
    // It searched for Account(provider="credentials") which is never created
    // (no registration endpoint exists), so it returned null 100% of the time.
    // Password hash was also stored in access_token (wrong field for OAuth model).
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role ?? "EDUCATOR";
      }
      // Refresh username from DB on sign-in, explicit update, OR whenever
      // the token still has no username (covers sessions issued before the
      // username was set, avoiding the "banner stuck" bug).
      if (user || trigger === "update" || (token.id && !token.username)) {
        const dbUser = await prisma.user.findUnique({
          where:  { id: (user?.id ?? token.id) as string },
          select: { username: true },
        });
        token.username = dbUser?.username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id       = token.id as string;
        session.user.role     = token.role as string;
        session.user.username = (token.username as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
});
