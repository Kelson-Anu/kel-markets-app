import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { marketsQuery } from "@/lib/market-queries";
import { useMarketRealtime } from "@/lib/use-market-realtime";
import { usePortfolio } from "@/lib/positions";
import { payoutLabel, poolSplit, usd, type Market } from "@/lib/markets";

/**
 * Trader view inside admin: live markets, the signed-in trader's open
 * positions and their balance, all in one place.
 */
export function TraderDashboard() {
  const { positions, balance, ready, close } = usePortfolio();
  const live = useQuery(marketsQuery);
  const markets: Market[] = live.data ?? [];
  const byId = (id: string) => markets.find((m) => m.id === id);

  const rows = positions.map((p) => {
    const market = byId(p.marketId);
    const price = market ? (p.outcome === "YES" ? market.yesPrice : 1 - market.yesPrice) : 0;
    const value = p.shares * price;
    return { p, market, value, pnl: value - p.cost };
  });

  const exposure = rows.reduce((s, r) => s + r.value, 0);
  const pnl = rows.reduce((s, r) => s + r.pnl, 0);
  const totalLiquidity = markets.reduce((s, m) => s + m.yesPool + m.noPool, 0);

  const stats: [string, string, string][] = [
    ["Cash balance", usd(ready ? balance : 0), "text-foreground"],
    ["Position value", usd(exposure), "text-foreground"],
    [
      "Open P&L",
      `${pnl >= 0 ? "+" : "-"}${usd(Math.abs(pnl))}`,
      pnl >= 0 ? "text-yes" : "text-no",
    ],
    ["Total market liquidity", usd(totalLiquidity), "text-foreground"],
  ];

  return (
    <div className="mt-6 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, cls]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`num mt-2 text-2xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold">Open positions</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          {!ready && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {ready && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No open positions yet.
            </p>
          )}
          {rows.map(({ p, market, value, pnl: rowPnl }) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-5 py-3 last:border-0"
            >
              <span
                className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  p.outcome === "YES" ? "bg-yes/15 text-yes" : "bg-no/15 text-no"
                }`}
              >
                {p.outcome}
              </span>
              <span className="text-sm font-medium">
                {market ? (
                  <Link to="/market/$marketId" params={{ marketId: market.id }} className="hover:text-primary">
                    {market.question}
                  </Link>
                ) : (
                  p.marketId
                )}
              </span>
              <span className="num ml-auto text-xs text-muted-foreground">
                {p.shares.toFixed(2)} @ {usd(p.avgPrice)}
              </span>
              <span className="num text-sm">{usd(value)}</span>
              <span className={`num text-sm font-semibold ${rowPnl >= 0 ? "text-yes" : "text-no"}`}>
                {rowPnl >= 0 ? "+" : "-"}
                {usd(Math.abs(rowPnl))}
              </span>
              <button
                onClick={() => close(p.id, market ? (p.outcome === "YES" ? market.yesPrice : 1 - market.yesPrice) : 0)}
                className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Live markets</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          {live.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {live.data?.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">No live markets yet.</p>
          )}
          {markets.map((m) => {
            const s = poolSplit(m);
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-5 py-3 last:border-0"
              >
                <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest">
                  {m.category}
                </span>
                <Link
                  to="/market/$marketId"
                  params={{ marketId: m.id }}
                  className="text-sm font-medium hover:text-primary"
                >
                  {m.question}
                </Link>
                <span className="num ml-auto text-xs text-yes">
                  {m.yesLabel} {s.yesPct.toFixed(0)}% · {payoutLabel(s.yesPayout)}
                </span>
                <span className="num text-xs text-no">
                  {m.noLabel} {s.noPct.toFixed(0)}% · {payoutLabel(s.noPayout)}
                </span>
                <span className="num text-xs text-muted-foreground">{usd(s.total)} pool</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
