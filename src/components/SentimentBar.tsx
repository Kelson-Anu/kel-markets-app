import { Info } from "lucide-react";
import { useState } from "react";
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
  yesPrice,
  yesLabel = "For",
  noLabel = "Against",
  className = "",
  size = "sm",
  updatedAt = null,
}: {
  yesPrice: number;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
  size?: "sm" | "lg";
  updatedAt?: string | null;
}) {
  const clamped = Math.min(1, Math.max(0, yesPrice));
  const yes = Math.round(clamped * 100);
  const no = 100 - yes;
  const updated = updatedAt ? relativeTime(updatedAt) : null;
  const [open, setOpen] = useState(false);

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const explanation = (
    <div className="max-w-[240px] space-y-1.5 text-xs leading-relaxed">
      <p>
        {yes}% of the money in the pool is backing {yesLabel}, {no}% is backing {noLabel}. The
        losing side's stake is shared out to the winners, so {yesLabel} currently pays{" "}
        {(1 / Math.max(0.01, clamped)).toFixed(2)}x and {noLabel} pays{" "}
        {(1 / Math.max(0.01, 1 - clamped)).toFixed(2)}x your stake.
      </p>
      <p className="text-muted-foreground">
        {updated ? `Prices last updated ${updated}.` : "Last update time unavailable."}
      </p>
      <p className="text-muted-foreground">Tap for the full breakdown.</p>
    </div>
  );

  const rows: Array<[string, string]> = [
    [`Pool backing ${yesLabel}`, `${(clamped * 100).toFixed(1)}%`],
    [`Pool backing ${noLabel}`, `${((1 - clamped) * 100).toFixed(1)}%`],
    [`${yesLabel} payout`, `${(1 / Math.max(0.01, clamped)).toFixed(2)}x your stake`],
    [`${noLabel} payout`, `${(1 / Math.max(0.01, 1 - clamped)).toFixed(2)}x your stake`],
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
              Everyone's stake goes into one pool. The split shows how much of that pool sits on
              each side; when the market settles, the losing side's money is shared out to the
              winners in proportion to what they staked.
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
            The two sides always add up to 100%. The smaller side pays out more per dollar, because
            fewer winners share the same losing pool.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
