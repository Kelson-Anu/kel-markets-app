import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function logAudit(entry: {
  marketId: string;
  marketQuestion: string;
  action: string;
  details?: Record<string, unknown>;
  actorId: string;
  actorEmail: string | null;
}) {
  await supabaseAdmin.from("market_audit_log").insert({
    market_id: entry.marketId,
    market_question: entry.marketQuestion,
    action: entry.action,
    details: (entry.details ?? {}) as unknown as never,
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
  });
}

export async function notify(entry: {
  userId: string | null;
  kind: string;
  title: string;
  body?: string;
  marketId?: string | null;
}) {
  await supabaseAdmin.from("notifications").insert({
    user_id: entry.userId,
    kind: entry.kind,
    title: entry.title,
    body: entry.body ?? "",
    market_id: entry.marketId ?? null,
  });
}