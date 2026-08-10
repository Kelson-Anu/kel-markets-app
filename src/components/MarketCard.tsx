import { Link } from "@tanstack/react-router";
import { SentimentBar } from "./SentimentBar";
import { priceLabel, type Market } from "@/lib/markets";

export function MarketCard({ market }: { market: Market }) {
  return (
    <Link
      to="/market/$marketId"
      params={{ marketId: market.id }}
      className="group flex flex-col gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-sm bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
          {market.category}
        </span>
        <span className="num ml-auto text-xs text-muted-foreground">{market.closes}</span>
      </div>

      <h3 className="text-base font-semibold leading-snug">{market.question}</h3>

      {market.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {market.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <div className="num text-3xl font-bold leading-none">
          {priceLabel(market.yesPrice, market.priceDisplay)}
        </div>
        <SentimentBar
          yesPrice={market.yesPrice}
          yesLabel={market.yesLabel}
          noLabel={market.noLabel}
          className="mt-3"
        />
      </div>

      <div className="flex gap-2">
        <span className="flex-1 rounded-md border border-yes/40 bg-yes/10 py-2 text-center text-sm font-semibold text-yes">
          {market.yesLabel} {priceLabel(market.yesPrice, market.priceDisplay)}
        </span>
        <span className="flex-1 rounded-md border border-no/40 bg-no/10 py-2 text-center text-sm font-semibold text-no">
          {market.noLabel} {priceLabel(1 - market.yesPrice, market.priceDisplay)}
        </span>
      </div>
    </Link>
  );
}