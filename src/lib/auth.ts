import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // Google OAuth (conditional on env vars)
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({
          clientId:     process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        })]
      : []),

    // GitHub OAuth (conditional on env vars)
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [GitHub({
          clientId:     process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
        })]
      : []),

    // Magic link via Resend (email login — no password required)
    ...(process.env.RESEND_API_KEY
      ? [Resend({
          apiKey: process.env.RESEND_API_KEY,
          from:   process.env.EMAIL_FROM ?? "EduHub <noreply@resend.dev>",
          // Custom email template
          async sendVerificationRequest({ identifier: email, url, provider }) {
            const { Resend: ResendClient } = await import("resend");
            const resend = new ResendClient(provider.apiKey as string);

            await resend.emails.send({
              from:    provider.from as string,
              to:      email,
              subject: "Tu link de acceso a EduHub",
              html:    buildMagicLinkEmail(url),
            });
          },
        })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role ?? "EDUCATOR";
      }
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
    signIn:        "/login",
    error:         "/login",
    verifyRequest: "/login?verify=1",  // shown after magic link is sent
  },
});

// ── Email template ────────────────────────────────────────────────────────────
function buildMagicLinkEmail(url: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Accedé a EduHub</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:#15803d;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.3px;">EduHub</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                Tu link de acceso
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                Hacé click en el botón para entrar a EduHub. El link expira en <strong>10 minutos</strong> y solo funciona una vez.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${url}"
                      style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.1px;">
                      Entrar a EduHub
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                Si no podés hacer click en el botón, copiá este link en tu navegador:
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;background:#f9fafb;padding:10px 12px;border-radius:8px;border:1px solid #e5e7eb;">
                ${url}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Si no solicitaste este link, podés ignorar este correo. Tu cuenta no corre ningún riesgo.<br/>
                Este mensaje fue enviado por EduHub — la plataforma educativa colaborativa.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
