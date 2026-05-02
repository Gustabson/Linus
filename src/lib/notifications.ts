import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import type { NotificationType } from "@prisma/client";

// ── Preference field for each notification type ───────────────────────────────
const TYPE_TO_PREF: Partial<Record<NotificationType, string>> = {
  NEW_FOLLOWER:      "notifSeguidores",
  NEW_LIKE:          "notifLikes",
  NEW_COMMENT:       "notifComentarios",
  NEW_PROPOSAL:      "notifPropuestas",
  PROPOSAL_REVIEWED: "notifPropuestas",
  // NEW_FORK: no dedicated toggle yet
};

// ── Subject line per type ─────────────────────────────────────────────────────
const TYPE_SUBJECT: Partial<Record<NotificationType, (actor: string) => string>> = {
  NEW_FOLLOWER:      (a) => `${a} empezó a seguirte en EduHub`,
  NEW_LIKE:          (a) => `A ${a} le gustó tu publicación`,
  NEW_COMMENT:       (a) => `${a} comentó en tu publicación`,
  NEW_PROPOSAL:      (a) => `${a} envió una propuesta en tu kernel`,
  PROPOSAL_REVIEWED: (a) => `Tu propuesta fue revisada`,
};

// ── Friendly body per type ────────────────────────────────────────────────────
const TYPE_BODY: Partial<Record<NotificationType, (actor: string) => string>> = {
  NEW_FOLLOWER:      (a) => `<strong>${a}</strong> ahora te sigue. Podés ver su perfil y seguirlo de vuelta.`,
  NEW_LIKE:          (a) => `<strong>${a}</strong> le dio me gusta a una de tus publicaciones.`,
  NEW_COMMENT:       (a) => `<strong>${a}</strong> dejó un comentario en tu publicación. Entrá a responder.`,
  NEW_PROPOSAL:      (a) => `<strong>${a}</strong> envió una propuesta de cambio en uno de tus kernels. Revisala y decidí si la aceptás.`,
  PROPOSAL_REVIEWED: (a) => `La revisión de tu propuesta ya está lista. Entrá para ver el resultado.`,
};

interface CreateNotificationArgs {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  link: string;
}

/**
 * Creates a notification in DB and (optionally) sends an email to the
 * recipient if they have the corresponding preference enabled.
 *
 * Never throws — notifications must never break the main action.
 */
export async function createNotification({
  type,
  recipientId,
  actorId,
  link,
}: CreateNotificationArgs): Promise<void> {
  if (recipientId === actorId) return;

  try {
    // 1. Create DB notification
    await prisma.notification.create({
      data: { type, recipientId, actorId, link },
    });

    // 2. Send email if preference is on and Resend is configured
    const prefField = TYPE_TO_PREF[type];
    if (!prefField || !process.env.RESEND_API_KEY) return;

    const [recipient, actor] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: recipientId },
        select: { email: true, [prefField]: true },
      }),
      prisma.user.findUnique({
        where:  { id: actorId },
        select: { name: true, username: true },
      }),
    ]);

    if (!recipient?.email) return;
    if (!(recipient as Record<string, unknown>)[prefField]) return;

    const actorName = actor?.name ?? actor?.username ?? "Alguien";
    const subject   = TYPE_SUBJECT[type]?.(actorName);
    const body      = TYPE_BODY[type]?.(actorName);
    if (!subject || !body) return;

    const appUrl = process.env.AUTH_URL ?? "https://eduhub.vercel.app";
    const fullLink = link.startsWith("http") ? link : `${appUrl}${link}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    "EduHub <onboarding@resend.dev>",
      to:      recipient.email,
      subject,
      html:    buildNotificationEmail({ subject, body, link: fullLink }),
    });
  } catch {
    // swallow — notifications must never break the main action
  }
}

/**
 * Sends an email notification for a new internal correo (direct message).
 * Called from POST /api/correos when isDraft is false.
 */
export async function sendCorreoEmail({
  recipientId,
  senderName,
  subject,
  previewText,
}: {
  recipientId: string;
  senderName:  string;
  subject:     string;
  previewText: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const recipient = await prisma.user.findUnique({
      where:  { id: recipientId },
      select: { email: true, notifCorreos: true },
    });

    if (!recipient?.email || !recipient.notifCorreos) return;

    const appUrl = process.env.AUTH_URL ?? "https://eduhub.vercel.app";
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from:    "EduHub <onboarding@resend.dev>",
      to:      recipient.email,
      subject: `Nuevo correo de ${senderName}: ${subject}`,
      html:    buildNotificationEmail({
        subject: `Nuevo correo de ${senderName}`,
        body:    `<strong>${senderName}</strong> te envió un mensaje: <em>"${previewText}"</em>`,
        link:    `${appUrl}/correos`,
        cta:     "Ver correo",
      }),
    });
  } catch {
    // swallow
  }
}

// ── Email template ─────────────────────────────────────────────────────────────
function buildNotificationEmail({
  subject,
  body,
  link,
  cta = "Ver en EduHub",
}: {
  subject: string;
  body:    string;
  link:    string;
  cta?:    string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:#15803d;padding:24px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">EduHub</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
                ${subject}
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                ${body}
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:4px 0 8px;">
                    <a href="${link}"
                      style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;">
                      ${cta}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Recibís este correo porque tenés activadas las notificaciones en EduHub.<br/>
                Podés cambiar tus preferencias en <a href="${process.env.AUTH_URL ?? ""}/configuracion" style="color:#15803d;">Configuración → Notificaciones</a>.
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
