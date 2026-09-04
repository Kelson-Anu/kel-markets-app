import { Link } from "@tanstack/react-router";
import { SentimentBar } from "./SentimentBar";
import { Sparkline } from "./Sparkline";
import { hasChartData, useMarketView } from "@/lib/view-preference";
import { poolSplit, payoutLabel, usd, type Market } from "@/lib/markets";

export function MarketCard({ market }: { market: Market }) {
  const { view } = useMarketView();
  const showChart = view === "chart" && hasChartData(market.history);
  const split = poolSplit(market);
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

      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>Liquidity</span>
        <span className="num rounded-sm border border-border px-1.5 py-0.5 text-xs normal-case tracking-normal text-foreground">
          {usd(split.total)}
        </span>
      </div>

      {market.marketType === "versus" && (market.imageUrl || market.imageUrl2) ? (
        <div className="grid grid-cols-2 gap-2">
          {[market.imageUrl, market.imageUrl2].map((src, i) =>
            src ? (
              <img
                key={i}
                src={src}
                alt={i === 0 ? market.yesLabel : market.noLabel}
                loading="lazy"
                className="h-28 w-full rounded-md object-cover"
              />
            ) : (
              <div key={i} className="h-28 w-full rounded-md border border-border bg-secondary" />
            ),
          )}
        </div>
      ) : (
        market.imageUrl && (
          <img
            src={market.imageUrl}
            alt={market.question}
            loading="lazy"
            className="h-36 w-full rounded-md object-cover"
          />
        )
      )}

      <h3 className="text-base font-semibold leading-snug">{market.question}</h3>

      {market.extraQuestions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          +{market.extraQuestions.length} more question
          {market.extraQuestions.length > 1 ? "s" : ""} on this post
        </p>
      )}

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
        <div className="flex items-end gap-4">
          <div className="num text-3xl font-bold leading-none">
            {split.hasBets ? `${Math.round(split.yesPct)}%` : "0%"}
          </div>
          {showChart && (
            <Sparkline
              data={market.history}
              up={market.change24h >= 0}
              className="h-10 flex-1"
            />
          )}
        </div>
        {!showChart && (
          <SentimentBar
            yesPool={market.yesPool}
            noPool={market.noPool}
            yesBettors={market.yesBettors}
            noBettors={market.noBettors}
            yesLabel={market.yesLabel}
            noLabel={market.noLabel}
            updatedAt={market.updatedAt}
            className="mt-3"
          />
        )}
      </div>

      <div className="flex gap-2">
        <span className="flex-1 rounded-md border border-yes/40 bg-yes/10 py-2 text-center text-sm font-semibold text-yes">
          {market.yesLabel} {Math.round(split.yesPct)}%
          <span className="num block text-[11px] font-normal opacity-80">
            pays {payoutLabel(split.yesPayout)}
          </span>
        </span>
        <span className="flex-1 rounded-md border border-no/40 bg-no/10 py-2 text-center text-sm font-semibold text-no">
          {market.noLabel} {Math.round(split.noPct)}%
          <span className="num block text-[11px] font-normal opacity-80">
            pays {payoutLabel(split.noPayout)}
          </span>
        </span>
      </div>
    </Link>
  );
}