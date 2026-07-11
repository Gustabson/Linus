import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { getSession, unauthorized, parseBody, safeString } from "@/lib/api-helpers";

const VALID_REASONS = ["spam", "inappropriate", "misinformation", "other"] as const;
type Reason = (typeof VALID_REASONS)[number];

// ── POST /api/posts/[id]/report ───────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const reason = safeString(body.reason, 30) ?? "";
  const detail = body.detail == null || body.detail === "" ? null : safeString(body.detail, 500);

  if (!VALID_REASONS.includes(reason as Reason))
    return NextResponse.json(
      { error: "Motivo inválido. Usá: spam, inappropriate, misinformation, other" },
      { status: 400 },
    );
  if (body.detail != null && body.detail !== "" && !detail)
    return NextResponse.json({ error: "El detalle supera 500 caracteres" }, { status: 400 });

  const post = await prisma.post.findUnique({
    where:  { id },
    select: { authorId: true },
  });

  if (!post)
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  // Authors can't report their own posts
  if (post.authorId === session.user.id)
    return NextResponse.json({ error: "No podés reportar tu propia publicación" }, { status: 400 });

  try {
    await prisma.postReport.create({
      data: {
        postId:     id,
        reporterId: session.user.id,
        reason,
        detail,
      },
    });
  } catch (err: unknown) {
    // Unique constraint: user already reported this post
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Ya reportaste esta publicación" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
