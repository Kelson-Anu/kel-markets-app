import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Sparkline } from "@/components/Sparkline";
import { cents, usd, type Outcome } from "@/lib/markets";
import { marketQuery } from "@/lib/market-queries";
import { usePortfolio } from "@/lib/positions";
import { recordTrade } from "@/lib/markets.functions";

export const Route = createFileRoute("/market/$marketId")({
  loader: async ({ context, params }) => {
    const market = await context.queryClient.ensureQueryData(marketQuery(params.marketId));
    if (!market) throw notFound();
    return { market };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Market unavailable — KELMARKETS" }, { name: "robots", content: "noindex" }],
      };
    }
    const t = `${loaderData.market.question} — KELMARKETS`;
    const d = loaderData.market.description;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
      ],
    };
  },
  component: MarketPage,
});

function MarketPage() {
  const { marketId } = Route.useParams();
  const { data } = useSuspenseQuery(marketQuery(marketId));
  const market = data ?? Route.useLoaderData().market;
  const { trade, balance, positions } = usePortfolio();
  const [outcome, setOutcome] = useState<Outcome>("YES");
  const [amount, setAmount] = useState(25);

  const price = outcome === "YES" ? market.yesPrice : 1 - market.yesPrice;
  const shares = amount / price;
  const held = positions.filter((p) => p.marketId === market.id);
  const up = market.change24h >= 0;

  const submit = () => {
    if (trade(market.id, outcome, price, amount)) {
      toast.success(`Bought ${shares.toFixed(1)} ${outcome} shares at ${cents(price)}`);
      void recordTrade({
        data: {
          marketId: market.id,
          question: market.question,
          outcome,
          shares,
          price,
          cost: amount,
        },
      }).catch(() => {});
    } else {
      toast.error("Not enough cash for this order.");
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← All markets
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <span className="rounded-sm bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
              {market.category}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{market.question}</h1>
            {market.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {market.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 rounded-lg border border-border bg-card p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Yes price
                  </p>
                  <p className="num mt-1 text-5xl font-bold">{cents(market.yesPrice)}</p>
                </div>
                <p
                  className="num text-sm font-medium"
                  style={{ color: up ? "var(--yes)" : "var(--no)" }}
                >
                  {up ? "+" : ""}
                  {market.change24h.toFixed(1)} pts · 24h
                </p>
              </div>
              <Sparkline data={market.history} up={up} className="mt-6 h-40 w-full" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                ["Volume", usd(market.volume)],
                ["Liquidity", usd(market.liquidity)],
                ["Closes", market.closes],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{l}</p>
                  <p className="num mt-1 text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>

            {market.resolution && (
              <div
                className="mt-6 rounded-lg border p-4 text-sm font-semibold"
                style={{
                  borderColor: market.resolution === "YES" ? "var(--yes)" : "var(--no)",
                  color: market.resolution === "YES" ? "var(--yes)" : "var(--no)",
                }}
              >
                Resolved {market.resolution}
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-semibold">Resolution rules</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {market.description}
              </p>
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold">Place an order</h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["YES", "NO"] as Outcome[]).map((o) => {
                const active = outcome === o;
                const color = o === "YES" ? "var(--yes)" : "var(--no)";
                return (
                  <button
                    key={o}
                    onClick={() => setOutcome(o)}
                    className="rounded-md border py-3 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: active ? color : "var(--border)",
                      backgroundColor: active ? `color-mix(in oklab, ${color} 16%, transparent)` : "transparent",
                      color: active ? color : "var(--muted-foreground)",
                    }}
                  >
                    {o} {cents(o === "YES" ? market.yesPrice : 1 - market.yesPrice)}
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block text-[11px] uppercase tracking-widest text-muted-foreground">
              Amount (USD)
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="num mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-lg outline-none focus:border-primary"
            />
            <div className="mt-2 flex gap-2">
              {[10, 25, 100, 250].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="num flex-1 rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  ${v}
                </button>
              ))}
            </div>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shares</dt>
                <dd className="num">{shares.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payout if correct</dt>
                <dd className="num font-semibold text-primary">${shares.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cash available</dt>
                <dd className="num">${balance.toFixed(2)}</dd>
              </div>
            </dl>

            <button
              disabled={Boolean(market.resolution)}
              onClick={submit}
              className="mt-5 w-full rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {market.resolution ? "Market resolved" : `Buy ${outcome}`}
            </button>

            {held.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Your position
                </p>
                {held.map((p) => (
                  <p key={p.id} className="num mt-2 text-sm">
                    {p.shares.toFixed(2)} {p.outcome} @ {cents(p.avgPrice)}
                  </p>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}