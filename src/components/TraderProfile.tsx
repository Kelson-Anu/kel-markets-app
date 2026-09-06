import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { marketsQuery } from "@/lib/market-queries";
import { useMarketRealtime } from "@/lib/use-market-realtime";
import { usePortfolio } from "@/lib/positions";
import { useSession } from "@/lib/use-session";
import { useTraderProfile } from "@/lib/use-profile";
import { usd, type Market } from "@/lib/markets";

const when = (ts: number) => new Date(ts).toLocaleString();

/**
 * Per-trader profile: who is signed in, their lifetime stats and their
 * full trade history — distinct from the aggregate admin dashboard.
 */
export function TraderProfile() {
  useMarketRealtime();
  const { user } = useSession();
  const profile = useTraderProfile().data;
  const { positions, balance, history, ready } = usePortfolio();
  const live = useQuery(marketsQuery);
  const markets: Market[] = live.data ?? [];
  const nameOf = (id: string) => markets.find((m) => m.id === id)?.question ?? id;

  const closed = history.filter((h) => h.kind === "close");
  const wins = closed.filter((h) => (h.pnl ?? 0) > 0).length;
  const realized = closed.reduce((s, h) => s + (h.pnl ?? 0), 0);
  const staked = history.filter((h) => h.kind === "open").reduce((s, h) => s + h.amount, 0);
  const openValue = positions.reduce((s, p) => {
    const m = markets.find((x) => x.id === p.marketId);
    const price = m ? (p.outcome === "YES" ? m.yesPrice : 1 - m.yesPrice) : 0;
    return s + p.shares * price;
  }, 0);
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const firstTrade = history.length ? history[history.length - 1]!.at : null;

  const stats: [string, string, string][] = [
    ["Cash balance", usd(ready ? balance : 0), "text-foreground"],
    ["Account value", usd((ready ? balance : 0) + openValue), "text-foreground"],
    [
      "Realized P&L",
      `${realized >= 0 ? "+" : "-"}${usd(Math.abs(realized))}`,
      realized >= 0 ? "text-yes" : "text-no",
    ],
    ["Win rate", `${winRate.toFixed(0)}% (${wins}/${closed.length})`, "text-foreground"],
    ["Total staked", usd(staked), "text-foreground"],
    ["Trades placed", String(history.filter((h) => h.kind === "open").length), "text-foreground"],
  ];

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Trader</p>
        <p className="mt-1 text-lg font-semibold">{user?.email ?? "Guest trader"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {positions.length} open position{positions.length === 1 ? "" : "s"}
          {firstTrade ? ` · trading since ${new Date(firstTrade).toLocaleDateString()}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value, cls]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`num mt-2 text-2xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold">Trade history</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          {!ready && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {ready && history.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">No trades yet.</p>
          )}
          {history.map((h) => (
            <div
              key={h.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-5 py-3 last:border-0"
            >
              <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {h.kind === "open" ? "Bet" : "Closed"}
              </span>
              <span
                className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  h.outcome === "YES" ? "bg-yes/15 text-yes" : "bg-no/15 text-no"
                }`}
              >
                {h.outcome}
              </span>
              <Link
                to="/market/$marketId"
                params={{ marketId: h.marketId }}
                className="text-sm font-medium hover:text-primary"
              >
                {nameOf(h.marketId)}
              </Link>
              <span className="num ml-auto text-xs text-muted-foreground">{when(h.at)}</span>
              <span className="num text-xs text-muted-foreground">
                {h.shares.toFixed(2)} @ {usd(h.price)}
              </span>
              <span className="num text-sm">{usd(h.amount)}</span>
              {h.kind === "close" && (
                <span
                  className={`num text-sm font-semibold ${(h.pnl ?? 0) >= 0 ? "text-yes" : "text-no"}`}
                >
                  {(h.pnl ?? 0) >= 0 ? "+" : "-"}
                  {usd(Math.abs(h.pnl ?? 0))}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
