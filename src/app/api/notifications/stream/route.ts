import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS  = 5_000;   // check for new notifications
const HEARTBEAT_MS      = 20_000;  // keep-alive comment to prevent timeout

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastUnreadCount = -1;
      let lastIds: string[] = [];
      let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
      let pollTimer:      ReturnType<typeof setTimeout> | null = null;

      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          );
        } catch {
          closed = true;
        }
      }

      function sendHeartbeat() {
        if (closed) return;
        try {
          controller.enqueue(": heartbeat\n\n");
        } catch {
          closed = true;
          return;
        }
        heartbeatTimer = setTimeout(sendHeartbeat, HEARTBEAT_MS);
      }

      async function poll() {
        if (closed) return;

        try {
          const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
              where: { recipientId: userId },
              include: {
                actor: { select: { name: true, username: true, image: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 30,
            }),
            prisma.notification.count({
              where: { recipientId: userId, read: false },
            }),
          ]);

          const ids = notifications.map((n) => n.id);
          const changed =
            unreadCount !== lastUnreadCount ||
            ids.some((id, i) => id !== lastIds[i]);

          if (changed) {
            lastUnreadCount = unreadCount;
            lastIds = ids;
            send("notifications", { notifications, unreadCount });
          }
        } catch {
          // DB error — skip this tick
        }

        if (!closed) {
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }

      // kick off
      sendHeartbeat();
      await poll();

      // cleanup when client disconnects
      return () => {
        closed = true;
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
        if (pollTimer)      clearTimeout(pollTimer);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection:      "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
