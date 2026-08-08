import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { cents } from "@/lib/markets";
import { marketsQuery } from "@/lib/market-queries";
import { usePortfolio } from "@/lib/positions";

const title = "Your portfolio — KELMARKET";
const description =
  "Track your open YES and NO positions on KELMARKET, see live profit and loss, and cash out at the current market price.";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(marketsQuery),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { positions, balance, ready, close, reset } = usePortfolio();
  const { data: markets } = useSuspenseQuery(marketsQuery);
  const getMarket = (id: string) => markets.find((m) => m.id === id);

  const rows = positions.map((p) => {
    const market = getMarket(p.marketId);
    const price = market ? (p.outcome === "YES" ? market.yesPrice : 1 - market.yesPrice) : 0;
    const value = p.shares * price;
    return { p, market, price, value, pnl: value - p.cost };
  });

  const exposure = rows.reduce((s, r) => s + r.value, 0);
  const pnl = rows.reduce((s, r) => s + r.pnl, 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <button
            onClick={reset}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset account
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Cash", `$${(ready ? balance : 0).toFixed(2)}`, "text-foreground"],
            ["Position value", `$${exposure.toFixed(2)}`, "text-foreground"],
            [
              "Open P&L",
              `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)}`,
              pnl >= 0 ? "text-yes" : "text-no",
            ],
          ].map(([label, value, cls]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`num mt-2 text-2xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-20 text-center">
              <p className="text-sm text-muted-foreground">You have no open positions yet.</p>
              <Link
                to="/"
                className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Browse markets
              </Link>
            </div>
          )}

          {rows.map(({ p, market, price, value, pnl: rowPnl }) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-5"
            >
              <div className="min-w-[240px] flex-1">
                <Link
                  to="/market/$marketId"
                  params={{ marketId: p.marketId }}
                  className="font-semibold hover:text-primary"
                >
                  {market?.question ?? p.marketId}
                </Link>
                <p className="num mt-1 text-xs text-muted-foreground">
                  {p.shares.toFixed(2)} {p.outcome} shares @ {cents(p.avgPrice)}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-sm font-semibold">${value.toFixed(2)}</p>
                <p
                  className="num text-xs"
                  style={{ color: rowPnl >= 0 ? "var(--yes)" : "var(--no)" }}
                >
                  {rowPnl >= 0 ? "+" : "-"}${Math.abs(rowPnl).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => close(p.id, price)}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:border-primary hover:text-primary"
              >
                Cash out
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}