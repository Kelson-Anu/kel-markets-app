import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { MARKET_CATEGORIES, cents, parseTags, type Market } from "@/lib/markets";
import {
  adminMarketsQuery,
  adminStatusQuery,
  adminsQuery,
  auditLogQuery,
} from "@/lib/market-queries";
import {
  claimAdmin,
  deleteMarket,
  grantAdmin,
  resolveMarket,
  revokeAdmin,
  saveMarket,
  setMarketStatus,
} from "@/lib/markets.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Market admin — KELMARKET" },
      { name: "description", content: "Create, publish and resolve KELMARKET prediction markets." },
      { property: "og:title", content: "Market admin — KELMARKET" },
      { property: "og:description", content: "Create, publish and resolve KELMARKET markets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Draft = {
  id?: string;
  question: string;
  category: string;
  description: string;
  yesPrice: number;
  closes: string;
  status: "draft" | "published";
  tags: string[];
};

const emptyDraft: Draft = {
  question: "",
  category: "Politics",
  description: "",
  yesPrice: 0.5,
  closes: "",
  status: "draft",
  tags: [],
};

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const status = useQuery(adminStatusQuery);
  const isAdmin = status.data?.isAdmin ?? false;
  const markets = useQuery({ ...adminMarketsQuery, enabled: isAdmin });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [tab, setTab] = useState<"markets" | "activity" | "admins">("markets");
  const [newAdmin, setNewAdmin] = useState("");
  const audit = useQuery({ ...auditLogQuery, enabled: isAdmin && tab === "activity" });
  const admins = useQuery({ ...adminsQuery, enabled: isAdmin && tab === "admins" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["markets"] });
  };

  const onError = (e: Error) => toast.error(e.message);
  const onDone = (msg: string) => () => {
    toast.success(msg);
    refresh();
  };

  const save = useMutation({
    mutationFn: (d: Draft) => saveMarket({ data: d }),
    onSuccess: onDone("Market saved"),
    onError,
  });
  const publish = useMutation({
    mutationFn: (v: { id: string; status: "draft" | "published" }) => setMarketStatus({ data: v }),
    onSuccess: onDone("Status updated"),
    onError,
  });
  const resolve = useMutation({
    mutationFn: (v: { id: string; resolution: "YES" | "NO" | null }) => resolveMarket({ data: v }),
    onSuccess: onDone("Resolution updated"),
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMarket({ data: { id } }),
    onSuccess: onDone("Market deleted"),
    onError,
  });
  const claim = useMutation({
    mutationFn: () => claimAdmin(),
    onSuccess: () => {
      toast.success("You are now an admin");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const addAdmin = useMutation({
    mutationFn: (email: string) => grantAdmin({ data: { email } }),
    onSuccess: () => {
      toast.success("Admin access granted");
      setNewAdmin("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError,
  });
  const dropAdmin = useMutation({
    mutationFn: (userId: string) => revokeAdmin({ data: { userId } }),
    onSuccess: () => {
      toast.success("Admin access revoked");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError,
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const edit = (m: Market) =>
    setDraft({
      id: m.id,
      question: m.question,
      category: m.category,
      description: m.description,
      yesPrice: m.yesPrice,
      closes: m.closes,
      status: m.status,
      tags: m.tags,
    });

  if (status.isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="p-10 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="text-2xl font-bold">Admin access required</h1>
          {status.data && !status.data.anyAdminExists ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                No admin has been set up yet. Claim the admin role for this account.
              </p>
              <button
                onClick={() => claim.mutate()}
                disabled={claim.isPending}
                className="mt-6 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Become admin
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              This account is not an admin. Ask an existing admin for access.
            </p>
          )}
          <button onClick={signOut} className="mt-6 block w-full text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold">Market admin</h1>
          <button
            onClick={signOut}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>

        <div className="mt-6 flex gap-1.5">
          {(["markets", "activity", "admins"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors ${
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "activity" ? "Activity log" : t}
            </button>
          ))}
        </div>

        {tab === "activity" && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
            {audit.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
            {audit.data?.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">No activity yet.</p>
            )}
            {audit.data?.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 px-5 py-3 last:border-0"
              >
                <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest">
                  {row.action}
                </span>
                <span className="text-sm font-medium">{row.market_question || row.market_id}</span>
                <span className="ml-auto num text-xs text-muted-foreground">
                  {row.actor_email ?? "unknown"} · {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "admins" && (
          <div className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Admins</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addAdmin.mutate(newAdmin);
              }}
              className="mt-4 flex gap-2"
            >
              <input
                type="email"
                required
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                placeholder="teammate@example.com"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={addAdmin.isPending}
                className="rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Grant admin
              </button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              The person must already have a KELMARKET account.
            </p>
            <div className="mt-5 space-y-2">
              {admins.data?.map((a) => (
                <div
                  key={a.userId}
                  className="flex items-center gap-3 rounded-md border border-border px-4 py-2.5"
                >
                  <span className="text-sm">{a.email}</span>
                  {a.isSelf && (
                    <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      you
                    </span>
                  )}
                  {!a.isSelf && (
                    <button
                      onClick={() => dropAdmin.mutate(a.userId)}
                      className="ml-auto rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`mt-8 gap-8 lg:grid-cols-[1fr_1.4fr] ${tab === "markets" ? "grid" : "hidden"}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(draft, { onSuccess: () => setDraft(emptyDraft) });
            }}
            className="h-fit rounded-lg border border-border bg-card p-6"
          >
            <h2 className="text-lg font-semibold">{draft.id ? "Edit market" : "New market"}</h2>

            <label className="mt-5 block text-[11px] uppercase tracking-widest text-muted-foreground">
              Question
            </label>
            <input
              required
              maxLength={300}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            <label className="mt-4 block text-[11px] uppercase tracking-widest text-muted-foreground">
              Category
            </label>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {MARKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-[11px] uppercase tracking-widest text-muted-foreground">
              Tags (comma separated)
            </label>
            <input
              value={draft.tags.join(", ")}
              onChange={(e) => setDraft({ ...draft, tags: parseTags(e.target.value) })}
              placeholder="election, fed, ai"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            <label className="mt-4 block text-[11px] uppercase tracking-widest text-muted-foreground">
              Resolution rules
            </label>
            <textarea
              rows={4}
              maxLength={2000}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground">
                  Yes price (¢)
                </label>
                <input
                  type="number"
                  min={2}
                  max={98}
                  value={Math.round(draft.yesPrice * 100)}
                  onChange={(e) => setDraft({ ...draft, yesPrice: Number(e.target.value) / 100 })}
                  className="num mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground">
                  Closes
                </label>
                <input
                  placeholder="Dec 31, 2026"
                  value={draft.closes}
                  onChange={(e) => setDraft({ ...draft, closes: e.target.value })}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.status === "published"}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.checked ? "published" : "draft" })
                }
              />
              Publish to the public feed
            </label>

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={save.isPending}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {draft.id ? "Save changes" : "Create market"}
              </button>
              {draft.id && (
                <button
                  type="button"
                  onClick={() => setDraft(emptyDraft)}
                  className="rounded-md border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {markets.data?.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-snug">{m.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.category} · {cents(m.yesPrice)} · {m.closes || "no close date"}
                    </p>
                  </div>
                  <span
                    className="rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-widest"
                    style={{
                      color: m.status === "published" ? "var(--yes)" : "var(--muted-foreground)",
                      backgroundColor: "var(--secondary)",
                    }}
                  >
                    {m.resolution ? `Resolved ${m.resolution}` : m.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <button onClick={() => edit(m)} className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary">
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      publish.mutate({
                        id: m.id,
                        status: m.status === "published" ? "draft" : "published",
                      })
                    }
                    className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary"
                  >
                    {m.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => resolve.mutate({ id: m.id, resolution: "YES" })}
                    className="rounded-md border px-3 py-1.5"
                    style={{ borderColor: "var(--yes)", color: "var(--yes)" }}
                  >
                    Resolve YES
                  </button>
                  <button
                    onClick={() => resolve.mutate({ id: m.id, resolution: "NO" })}
                    className="rounded-md border px-3 py-1.5"
                    style={{ borderColor: "var(--no)", color: "var(--no)" }}
                  >
                    Resolve NO
                  </button>
                  {m.resolution && (
                    <button
                      onClick={() => resolve.mutate({ id: m.id, resolution: null })}
                      className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate(m.id)}
                    className="ml-auto rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {markets.data?.length === 0 && (
              <p className="py-16 text-center text-sm text-muted-foreground">No markets yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
