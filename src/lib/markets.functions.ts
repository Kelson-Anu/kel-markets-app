import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
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
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { walk } = await import("./markets");
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
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
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
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const setMarketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: "draft" | "published" }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("markets")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; resolution: "YES" | "NO" | null }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const update: Record<string, unknown> = { resolution: data.resolution };
    if (data.resolution) update["yes_price"] = data.resolution === "YES" ? 0.99 : 0.01;
    const { error } = await context.supabase.from("markets").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("markets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
