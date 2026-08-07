import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketCard } from "@/components/MarketCard";
import { CATEGORIES, MARKETS, usd } from "@/lib/markets";

const title = "KELMARKETS — Trade the odds on real-world events";
const description =
  "KELMARKETS is a prediction market where you trade YES and NO shares on politics, crypto, sports and tech outcomes. Live odds, deep liquidity, instant settlement.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const markets = useMemo(
    () =>
      MARKETS.filter(
        (m) =>
          (category === "All" || m.category === category) &&
          m.question.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  );

  const totalVolume = MARKETS.reduce((s, m) => s + m.volume, 0);

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
              ["Open markets", String(MARKETS.length)],
              ["Total volume", usd(totalVolume)],
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

        <section className="py-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets"
              aria-label="Search markets"
              className="ml-auto w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary sm:w-64"
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
          {markets.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No markets match that search.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
