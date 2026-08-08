import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketCard } from "@/components/MarketCard";
import { Sparkline } from "@/components/Sparkline";
import { adminMarketQuery } from "@/lib/market-queries";
import { cents, usd } from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/preview/$marketId")({
  head: () => ({
    meta: [
      { title: "Market preview — KELMARKET" },
      { name: "description", content: "Preview a KELMARKET market before publishing it." },
      { property: "og:title", content: "Market preview — KELMARKET" },
      { property: "og:description", content: "Preview a market before publishing it." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { marketId } = Route.useParams();
  const { data: market, isLoading, error } = useQuery(adminMarketQuery(marketId));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to admin
        </Link>

        {isLoading && <p className="py-16 text-sm text-muted-foreground">Loading preview…</p>}
        {error && <p className="py-16 text-sm text-no">{(error as Error).message}</p>}
        {!isLoading && !error && !market && (
          <p className="py-16 text-sm text-muted-foreground">That market no longer exists.</p>
        )}

        {market && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">Preview</h1>
              <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                {market.resolution ? `resolved ${market.resolution}` : market.status}
              </span>
              <p className="w-full text-sm text-muted-foreground">
                This is exactly how the market appears in the public feed. Drafts are hidden from
                everyone until you publish them.
              </p>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Feed card
                </p>
                <div className="pointer-events-none max-w-sm">
                  <MarketCard market={market} />
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Market page
                </p>
                <div className="rounded-lg border border-border bg-card p-6">
                  <span className="rounded-sm bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {market.category}
                  </span>
                  <h2 className="mt-4 text-2xl font-bold leading-tight">{market.question}</h2>
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
                  <div className="mt-6 flex items-end gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Yes price
                      </p>
                      <p className="num mt-1 text-4xl font-bold">{cents(market.yesPrice)}</p>
                    </div>
                    <Sparkline
                      data={market.history}
                      up={market.change24h >= 0}
                      className="h-14 flex-1"
                    />
                  </div>
                  <p className="mt-6 whitespace-pre-wrap text-sm text-muted-foreground">
                    {market.description || "No resolution rules written yet."}
                  </p>
                  <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Volume
                      </dt>
                      <dd className="num mt-1 font-semibold">{usd(market.volume)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Liquidity
                      </dt>
                      <dd className="num mt-1 font-semibold">{usd(market.liquidity)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Closes
                      </dt>
                      <dd className="mt-1 font-semibold">{market.closes || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}