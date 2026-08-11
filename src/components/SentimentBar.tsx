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
        Percentages come straight from the live market price: {yesLabel} trades at {yes}¢ on the
        dollar, so the market prices it at {yes}% likely. {noLabel} is the remaining {no}%.
      </p>
      <p className="text-muted-foreground">
        {updated ? `Prices last updated ${updated}.` : "Last update time unavailable."}
      </p>
      <p className="text-muted-foreground">Tap for the full breakdown.</p>
    </div>
  );

  const rows: Array<[string, string]> = [
    [`${yesLabel} share price`, `$${clamped.toFixed(2)} (${(clamped * 100).toFixed(1)}¢)`],
    [`${noLabel} share price`, `$${(1 - clamped).toFixed(2)} (${((1 - clamped) * 100).toFixed(1)}¢)`],
    [`Implied ${yesLabel} chance`, `${clamped.toFixed(2)} × 100 = ${yes}%`],
    [`Implied ${noLabel} chance`, `100 − ${yes} = ${no}%`],
    ["Last price update", updated ?? "unavailable"],
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
              Prices are probabilities. A share pays $1 if it wins, so its price is what the market
              thinks the chance is.
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
            The two sides always add up to 100%. These are market-implied odds from trading activity,
            not a poll of participants.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
