import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { revalidatePath } from "next/cache";
import { resolveMailScope, type MailDeletionScope } from "@/lib/mail-trash";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const requestedScope = new URL(request.url).searchParams.get("scope");
  if (requestedScope && !["sender", "recipient", "both"].includes(requestedScope)) {
    return NextResponse.json({ error: "Alcance de restauración inválido" }, { status: 400 });
  }

  const { id } = await params;
  const message = await prisma.message.findUnique({
    where: { id },
    select: {
      senderId: true,
      recipientId: true,
      deletedBySender: true,
      deletedByRecipient: true,
    },
  });
  if (!message) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isSender = message.senderId === session.user.id;
  const isRecipient = message.recipientId === session.user.id;
  const resolvedScope = resolveMailScope(requestedScope as MailDeletionScope | null, isSender, isRecipient);
  if (!resolvedScope) {
    return NextResponse.json({ error: "Ese correo no pertenece a esa carpeta" }, { status: 403 });
  }
  const { affectSender, affectRecipient } = resolvedScope;

  const restoreAsSender = affectSender && message.deletedBySender;
  const restoreAsRecipient = affectRecipient && message.deletedByRecipient;
  if (!restoreAsSender && !restoreAsRecipient) {
    return NextResponse.json({ error: "El mensaje no está en tu papelera" }, { status: 400 });
  }

  await prisma.message.update({
    where: { id },
    data: {
      ...(restoreAsSender ? { deletedBySender: false, purgedBySender: false } : {}),
      ...(restoreAsRecipient ? { deletedByRecipient: false, purgedByRecipient: false } : {}),
    },
  });

  revalidatePath("/correos", "layout");
  revalidatePath("/linus-2/correos", "layout");
  return NextResponse.json({ ok: true, scope: requestedScope });
}
