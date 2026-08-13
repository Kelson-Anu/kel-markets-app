import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketCard } from "@/components/MarketCard";
import { CATEGORIES, usd } from "@/lib/markets";
import { marketsQuery } from "@/lib/market-queries";

const title = "KELMARKET — Trade the odds on real-world events";
const description =
  "KELMARKET is a prediction market where you trade YES and NO shares on politics, crypto, sports and tech outcomes. Live odds, deep liquidity, instant settlement.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(marketsQuery),
  component: Index,
});

function Index() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(true);

  const { data: all } = useSuspenseQuery(marketsQuery);

  const tags = useMemo(
    () => Array.from(new Set(all.flatMap((m) => m.tags))).sort().slice(0, 14),
    [all],
  );

  const markets = useMemo(
    () =>
      all.filter(
        (m) =>
          (category === "All" || m.category === category) &&
          (!tag || m.tags.includes(tag)) &&
          m.question.toLowerCase().includes(query.toLowerCase()),
      ),
    [all, category, query, tag],
  );

  const totalVolume = all.reduce((s, m) => s + m.volume, 0);
  const totalLiquidity = all.reduce((s, m) => s + m.yesPool + m.noPool, 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="border-b border-border py-14">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Prediction exchange</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            Put a price on what happens next.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Every headline becomes a tradable number. Buy YES or NO, watch the odds move, cash out
            whenever the crowd disagrees with you.
          </p>
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            {[
              ["Open markets", String(all.length)],
              ["Total volume", usd(totalVolume)],
              ["Total liquidity", usd(totalLiquidity)],
              ["Starting balance", "$1,000"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </dt>
                <dd className="num mt-1 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit lg:sticky lg:top-24">
            <button
              type="button"
              aria-expanded={catOpen}
              onClick={() => setCatOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3.5 py-2.5 text-sm font-medium"
            >
              <span>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Category
                </span>
                <span className="ml-2">{category}</span>
              </span>
              <span className={`transition-transform ${catOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            {catOpen && (
              <div className="mt-2 overflow-hidden rounded-md border border-border bg-card">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`block w-full px-3.5 py-2 text-left text-sm transition-colors ${
                      category === c
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {tags.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(tag === t ? null : t)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        tag === t
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets"
              aria-label="Search markets"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary sm:max-w-xs"
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {markets.map((m) => (
                <MarketCard key={m.id} market={m} />
              ))}
            </div>
            {markets.length === 0 && (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No markets match that search.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
