import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fromRow, type MarketRow } from "./markets";
import { COLUMNS, publicClient, assertAdmin, slugify } from "./market-helpers";

export const listPublicMarkets = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("markets")
    .select(COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as MarketRow[]).map(fromRow);
});

export const getPublicMarket = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("markets")
      .select(COLUMNS)
      .eq("status", "published")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? fromRow(row as MarketRow) : null;
  });

/** Admin-only read of any market (including drafts) for pre-publish preview. */
export const getAdminMarket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("markets")
      .select(COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? fromRow(row as unknown as MarketRow) : null;
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("market_audit_log")
      .select("id, market_id, market_question, action, details, actor_email, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, market_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const recordTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { marketId: string; question: string; outcome: "YES" | "NO"; shares: number; price: number; cost: number }) => data)
  .handler(async ({ data, context }) => {
    const { notify } = await import("./audit.server");
    await notify({
      userId: context.userId,
      kind: "trade",
      title: `Bought ${data.shares.toFixed(1)} ${data.outcome} · ${Math.round(data.price * 100)}¢`,
      body: `${data.question} — $${data.cost.toFixed(2)} filled.`,
      marketId: data.marketId,
    });
    return { ok: true };
  });

/** Admin management */
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (roles ?? []).map((r) => ({
      userId: r.user_id,
      email: emails.get(r.user_id) ?? "unknown",
      since: r.created_at,
      isSelf: r.user_id === context.userId,
    }));
  });

export const grantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => {
    const email = data.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    return { email };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === data.email);
    if (!match) throw new Error("No account found with that email. Ask them to sign up first.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: match.id, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    const { notify } = await import("./audit.server");
    await notify({
      userId: match.id,
      kind: "role",
      title: "You were granted admin access",
      body: "You can now create, publish and resolve markets.",
    });
    return { ok: true };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot revoke your own admin access.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return { isAdmin: Boolean(data), anyAdminExists: (count ?? 0) > 0 };
  });

/** Bootstrap: the first signed-in user may claim admin while no admin exists. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists for this workspace.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllMarkets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("markets")
      .select(COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MarketRow[]).map(fromRow);
  });

export type MarketInput = {
  id?: string;
  question: string;
  category: string;
  description: string;
  yesPrice: number;
  closes: string;
  status: "draft" | "published";
  tags: string[];
  yesLabel: string;
  noLabel: string;
  priceDisplay: "cents" | "percent" | "odds";
};

export const saveMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: MarketInput) => {
    if (!data.question.trim()) throw new Error("Question is required");
    if (data.question.length > 300) throw new Error("Question is too long");
    if (data.description.length > 2000) throw new Error("Description is too long");
    if (!(data.yesPrice > 0.01 && data.yesPrice < 0.99)) {
      throw new Error("Starting price must be between 2¢ and 98¢");
    }
    if (!data.yesLabel.trim() || !data.noLabel.trim()) {
      throw new Error("Both option labels are required");
    }
    if (data.yesLabel.length > 24 || data.noLabel.length > 24) {
      throw new Error("Option labels must be 24 characters or less");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { walk } = await import("./markets");
    const { logAudit, notify } = await import("./audit.server");
    const actorEmail = (context.claims as { email?: string } | null)?.email ?? null;
    if (data.id) {
      const { error } = await context.supabase
        .from("markets")
        .update({
          question: data.question.trim(),
          category: data.category,
          description: data.description.trim(),
          yes_price: data.yesPrice,
          closes: data.closes.trim(),
          status: data.status,
          tags: data.tags,
          yes_label: data.yesLabel.trim(),
          no_label: data.noLabel.trim(),
          price_display: data.priceDisplay,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit({
        marketId: data.id,
        marketQuestion: data.question.trim(),
        action: "updated",
        details: { status: data.status, category: data.category, tags: data.tags },
        actorId: context.userId,
        actorEmail,
      });
      return { id: data.id };
    }
    const id = `${slugify(data.question)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await context.supabase.from("markets").insert({
      id,
      question: data.question.trim(),
      category: data.category,
      description: data.description.trim(),
      yes_price: data.yesPrice,
      change_24h: 0,
      volume: 0,
      liquidity: 0,
      closes: data.closes.trim(),
      history: walk(data.yesPrice),
      status: data.status,
      tags: data.tags,
      yes_label: data.yesLabel.trim(),
      no_label: data.noLabel.trim(),
      price_display: data.priceDisplay,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await logAudit({
      marketId: id,
      marketQuestion: data.question.trim(),
      action: "created",
      details: { status: data.status, category: data.category, tags: data.tags },
      actorId: context.userId,
      actorEmail,
    });
    if (data.status === "published") {
      await notify({
        userId: null,
        kind: "market",
        title: "New market open",
        body: data.question.trim(),
        marketId: id,
      });
    }
    return { id };
  });

export const setMarketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: "draft" | "published" }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("markets")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("question")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { logAudit, notify } = await import("./audit.server");
    const question = row?.question ?? data.id;
    await logAudit({
      marketId: data.id,
      marketQuestion: question,
      action: data.status === "published" ? "published" : "unpublished",
      actorId: context.userId,
      actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
    });
    if (data.status === "published") {
      await notify({
        userId: null,
        kind: "market",
        title: "New market open",
        body: question,
        marketId: data.id,
      });
    }
    return { ok: true };
  });

export const resolveMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; resolution: "YES" | "NO" | null }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const update = {
      resolution: data.resolution,
      ...(data.resolution ? { yes_price: data.resolution === "YES" ? 0.99 : 0.01 } : {}),
    };
    const { data: row, error } = await context.supabase
      .from("markets")
      .update(update)
      .eq("id", data.id)
      .select("question")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { logAudit, notify } = await import("./audit.server");
    const question = row?.question ?? data.id;
    await logAudit({
      marketId: data.id,
      marketQuestion: question,
      action: data.resolution ? `resolved ${data.resolution}` : "reopened",
      actorId: context.userId,
      actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
    });
    await notify({
      userId: null,
      kind: "resolution",
      title: data.resolution ? `Market resolved ${data.resolution}` : "Market reopened",
      body: question,
      marketId: data.id,
    });
    return { ok: true };
  });

export const deleteMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase
      .from("markets")
      .select("question")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("markets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit({
      marketId: data.id,
      marketQuestion: row?.question ?? data.id,
      action: "deleted",
      actorId: context.userId,
      actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
    });
    return { ok: true };
  });
