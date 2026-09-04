import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SentimentBar } from "@/components/SentimentBar";
import { Sparkline } from "@/components/Sparkline";
import { hasChartData, useMarketView } from "@/lib/view-preference";
import { cents, usd, poolSplit, payoutLabel, type Outcome } from "@/lib/markets";
import { marketQuery } from "@/lib/market-queries";
import { usePortfolio } from "@/lib/positions";
import { recordTrade, placeBet } from "@/lib/markets.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/market/$marketId")({
  loader: async ({ context, params }) => {
    const market = await context.queryClient.ensureQueryData(marketQuery(params.marketId));
    if (!market) throw notFound();
    return { market };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Market unavailable — KELMARKET" }, { name: "robots", content: "noindex" }],
      };
    }
    const t = `${loaderData.market.question} — KELMARKET`;
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
  const queryClient = useQueryClient();

  const split = poolSplit(market);
  // Price = this side's share of the pool once the new stake lands; 50/50 when the pool is empty.
  const projectedTotal = split.total + amount;
  const projectedSide =
    (outcome === "YES" ? split.yesPool : split.noPool) + amount;
  const price = projectedTotal > 0 ? projectedSide / projectedTotal : 0.5;
  const projectedPayout = projectedSide > 0 ? projectedTotal / projectedSide : 1;
  const shares = amount / Math.max(0.01, price);
  const held = positions.filter((p) => p.marketId === market.id);
  const up = market.change24h >= 0;
  const { view } = useMarketView();
  const showChart = view === "chart" && hasChartData(market.history);
  const labelFor = (o: Outcome) => (o === "YES" ? market.yesLabel : market.noLabel);

  const submit = () => {
    if (trade(market.id, outcome, price, amount)) {
      toast.success(
        `Staked $${amount.toFixed(2)} on ${labelFor(outcome)} — pays ${projectedPayout.toFixed(2)}x if it wins`,
      );
      void placeBet({ data: { marketId: market.id, side: outcome, amount } })
        .then(() => queryClient.invalidateQueries({ queryKey: ["markets"] }))
        .catch(() => {});
      // Trade notifications are only stored for signed-in users.
      void supabase.auth
        .getSession()
        .then(({ data: s }) => {
          if (!s.session) return;
          return recordTrade({
            data: {
              marketId: market.id,
              question: market.question,
              outcome,
              shares,
              price,
              cost: amount,
            },
          });
        })
        .catch(() => {});
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
            {market.marketType === "versus" && (market.imageUrl || market.imageUrl2) ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { src: market.imageUrl, label: market.yesLabel },
                  { src: market.imageUrl2, label: market.noLabel },
                ].map((it, i) => (
                  <figure key={i} className="overflow-hidden rounded-lg border border-border">
                    {it.src ? (
                      <img src={it.src} alt={it.label} className="h-48 w-full object-cover" />
                    ) : (
                      <div className="h-48 w-full bg-secondary" />
                    )}
                    <figcaption className="px-3 py-2 text-center text-sm font-semibold">
                      {it.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              market.imageUrl && (
                <img
                  src={market.imageUrl}
                  alt={market.question}
                  className="mt-4 h-64 w-full rounded-lg border border-border object-cover"
                />
              )
            )}
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{market.question}</h1>
            {market.extraQuestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Also on this post
                </p>
                {market.extraQuestions.map(
                  (q: { question: string; yesLabel: string; noLabel: string }, i: number) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
                    >
                      <span className="text-sm font-medium">{q.question}</span>
                      <span className="ml-auto flex gap-2 text-xs">
                        <span className="rounded-md border border-yes/40 bg-yes/10 px-2 py-1 text-yes">
                          {q.yesLabel}
                        </span>
                        <span className="rounded-md border border-no/40 bg-no/10 px-2 py-1 text-no">
                          {q.noLabel}
                        </span>
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
            {market.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {market.tags.map((t: string) => (
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
                    Pool backing {market.yesLabel}
                  </p>
                  <p className="num mt-1 text-5xl font-bold">
                    {Math.round(split.yesPct)}%
                  </p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    {split.hasBets
                      ? `pays ${payoutLabel(split.yesPayout)} your stake`
                      : "no bets yet — be the first to stake"}
                  </p>
                </div>
                <p
                  className="num text-sm font-medium"
                  style={{ color: up ? "var(--yes)" : "var(--no)" }}
                >
                  {up ? "+" : ""}
                  {market.change24h.toFixed(1)} pts · 24h
                </p>
              </div>
              {showChart ? (
                <Sparkline data={market.history} up={up} className="mt-6 h-40 w-full" />
              ) : (
                <SentimentBar
                  yesPool={market.yesPool}
                  noPool={market.noPool}
                  yesBettors={market.yesBettors}
                  noBettors={market.noBettors}
                  yesLabel={market.yesLabel}
                  noLabel={market.noLabel}
            updatedAt={market.updatedAt}
                  size="lg"
                  className="mt-6"
                />
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                ["Volume", usd(market.volume)],
                ["Liquidity", usd(split.total)],
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
                Resolved {market.resolution === "YES" ? market.yesLabel : market.noLabel}
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
                const pct = o === "YES" ? split.yesPct : split.noPct;
                const pay = o === "YES" ? split.yesPayout : split.noPayout;
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
                    {labelFor(o)} {Math.round(pct)}%
                    <span className="num block text-[11px] font-normal opacity-80">
                      pays {payoutLabel(pay)}
                    </span>
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
                <dt className="text-muted-foreground">Your share of this side</dt>
                <dd className="num">
                  {projectedSide > 0 ? `${Math.round((amount / projectedSide) * 100)}%` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payout if correct</dt>
                <dd className="num font-semibold text-primary">
                  ${(amount * projectedPayout).toFixed(2)} ({projectedPayout.toFixed(2)}x)
                </dd>
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
              {market.resolution ? "Market resolved" : `Buy ${labelFor(outcome)}`}
            </button>

            {held.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Your position
                </p>
                {held.map((p) => (
                  <p key={p.id} className="num mt-2 text-sm">
                    {p.shares.toFixed(2)} {labelFor(p.outcome)} @ {cents(p.avgPrice)}
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