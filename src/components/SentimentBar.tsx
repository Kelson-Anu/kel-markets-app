import { Info } from "lucide-react";
import { useState } from "react";
import { poolSplit, payoutLabel } from "@/lib/markets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return null;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export function SentimentBar({
  yesPool,
  noPool,
  yesBettors = 0,
  noBettors = 0,
  yesLabel = "For",
  noLabel = "Against",
  className = "",
  size = "sm",
  updatedAt = null,
}: {
  yesPool: number;
  noPool: number;
  yesBettors?: number;
  noBettors?: number;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
  size?: "sm" | "lg";
  updatedAt?: string | null;
}) {
  const split = poolSplit({ yesPool, noPool, yesBettors, noBettors });
  const yes = Math.round(split.yesPct);
  const no = split.hasBets ? 100 - yes : 0;
  const updated = updatedAt ? relativeTime(updatedAt) : null;
  const [open, setOpen] = useState(false);

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const explanation = (
    <div className="max-w-[240px] space-y-1.5 text-xs leading-relaxed">
      {split.hasBets ? (
        <p>
          {yes}% of the money staked is on {yesLabel} ({split.yesBettors} bet
          {split.yesBettors === 1 ? "" : "s"}), {no}% on {noLabel} ({split.noBettors} bet
          {split.noBettors === 1 ? "" : "s"}). The losing side's stake is shared out to the
          winners, so {yesLabel} pays {payoutLabel(split.yesPayout)} and {noLabel} pays{" "}
          {payoutLabel(split.noPayout)} your stake.
        </p>
      ) : (
        <p>
          No bets yet — both sides sit at 0%. The split appears as soon as money is staked, and
          the side with less money backing it pays out more.
        </p>
      )}
      <p className="text-muted-foreground">
        {updated ? `Pool last updated ${updated}.` : "Last update time unavailable."}
      </p>
      <p className="text-muted-foreground">Tap for the full breakdown.</p>
    </div>
  );

  const rows: Array<[string, string]> = [
    ["Total pool", `$${split.total.toFixed(2)}`],
    [`${yesLabel} pool`, `$${split.yesPool.toFixed(2)} · ${split.yesBettors} bet${split.yesBettors === 1 ? "" : "s"}`],
    [`${noLabel} pool`, `$${split.noPool.toFixed(2)} · ${split.noBettors} bet${split.noBettors === 1 ? "" : "s"}`],
    [`${yesLabel} share`, `${split.yesPct.toFixed(1)}%`],
    [`${noLabel} share`, `${split.noPct.toFixed(1)}%`],
    [`${yesLabel} payout`, `${payoutLabel(split.yesPayout)} your stake`],
    [`${noLabel} payout`, `${payoutLabel(split.noPayout)} your stake`],
    ["Last update", updated ?? "unavailable"],
  ];

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs font-medium">
        <span className="num" style={{ color: "var(--yes)" }}>
          {yes}% {yesLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="num" style={{ color: "var(--no)" }}>
            {no}% {noLabel}
          </span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openModal}
                  aria-label="How these percentages are calculated"
                  className="-m-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="end">
                {explanation}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </div>

      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openModal}
              aria-label={`${yes}% ${yesLabel}, ${no}% ${noLabel}. Show the full calculation`}
              className={`mt-1.5 flex w-full cursor-help overflow-hidden rounded-full bg-secondary ${size === "lg" ? "h-3" : "h-2"}`}
            >
              <span style={{ width: `${yes}%`, backgroundColor: "var(--yes)" }} />
              <span style={{ width: `${no}%`, backgroundColor: "var(--no)" }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{explanation}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>How this split is calculated</DialogTitle>
            <DialogDescription>
              Each side's percentage is the money staked on that side divided by the total pool,
              so with no bets both sides show 0%. When the market settles, the losing side's money
              is shared out to the winners in proportion to what they staked — the side with fewer
              backers pays more.
            </DialogDescription>
          </DialogHeader>

          <div className="flex overflow-hidden rounded-full bg-secondary h-3">
            <div style={{ width: `${yes}%`, backgroundColor: "var(--yes)" }} />
            <div style={{ width: `${no}%`, backgroundColor: "var(--no)" }} />
          </div>

          <dl className="divide-y divide-border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="num font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Once bets exist the two sides add up to 100%. The smaller side pays out more per
            dollar, because fewer winners share the same losing pool.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
