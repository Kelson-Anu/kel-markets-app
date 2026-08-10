import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const yes = Math.min(100, Math.max(0, Math.round(yesPrice * 100)));
  const no = 100 - yes;
  const updated = updatedAt ? relativeTime(updatedAt) : null;

  const explanation = (
    <div className="max-w-[240px] space-y-1.5 text-xs leading-relaxed">
      <p>
        Percentages come straight from the live market price: {yesLabel} trades at {yes}¢ on the
        dollar, so the market prices it at {yes}% likely. {noLabel} is the remaining {no}%.
      </p>
      <p className="text-muted-foreground">
        {updated ? `Prices last updated ${updated}.` : "Last update time unavailable."}
      </p>
    </div>
  );

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
              <TooltipTrigger
                asChild
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  aria-label="How these percentages are calculated"
                  className="text-muted-foreground transition-colors hover:text-foreground"
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
            <div
              className={`mt-1.5 flex w-full cursor-help overflow-hidden rounded-full bg-secondary ${size === "lg" ? "h-3" : "h-2"}`}
              role="img"
              aria-label={`${yes}% ${yesLabel}, ${no}% ${noLabel}`}
            >
              <div style={{ width: `${yes}%`, backgroundColor: "var(--yes)" }} />
              <div style={{ width: `${no}%`, backgroundColor: "var(--no)" }} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{explanation}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
