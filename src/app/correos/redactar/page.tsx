import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { CorreosRedactar } from "@/components/correos/CorreosRedactar";

export const dynamic = "force-dynamic";

export default async function RedactarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await searchParams;

  // If editing an existing draft, load it
  if (id) {
    const draft = await prisma.message.findUnique({
      where:  { id },
      select: {
        id:      true,
        subject: true,
        body:    true,
        isDraft: true,
        senderId: true,
        recipient: { select: { username: true, name: true } },
      },
    });

    // Ownership + must be a draft
    if (!draft || draft.senderId !== session.user.id || !draft.isDraft) notFound();

    return (
      <CorreosRedactar
        draftId={draft.id}
        initialSubject={draft.subject}
        initialBody={draft.body}
        initialRecipient={
          draft.recipient?.username
            ? { username: draft.recipient.username, name: draft.recipient.name ?? draft.recipient.username }
            : null
        }
      />
    );
  }

  // New blank message
  return <CorreosRedactar />;
}
