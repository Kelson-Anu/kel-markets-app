import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

/** Tooltip that opens on hover/focus (desktop) and on tap (touch), with tap-away dismiss. */
function useTapTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (e: Event) => {
      const target = e.target as Node | null;
      if (target && ref.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", dismiss, true);
    window.addEventListener("scroll", dismiss, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("scroll", dismiss, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return { open, setOpen, toggle, ref };
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
  const info = useTapTooltip();
  const bar = useTapTooltip();

  const explanation = (
    <div className="max-w-[240px] space-y-1.5 text-xs leading-relaxed">
      <p>
        Percentages come straight from the live market price: {yesLabel} trades at {yes}¢ on the
        dollar, so the market prices it at {yes}% likely. {noLabel} is the remaining {no}%.
      </p>
      <p className="text-muted-foreground">
        {updated ? `Prices last updated ${updated}.` : "Last update time unavailable."}
      </p>
      <p className="text-muted-foreground sm:hidden">Tap anywhere to dismiss.</p>
    </div>
  );

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs font-medium">
        <span className="num" style={{ color: "var(--yes)" }}>
          {yes}% {yesLabel}
        </span>
        <span className="flex items-center gap-1.5" ref={info.ref}>
          <span className="num" style={{ color: "var(--no)" }}>
            {no}% {noLabel}
          </span>
          <TooltipProvider delayDuration={150}>
            <Tooltip open={info.open} onOpenChange={info.setOpen}>
              <TooltipTrigger
                asChild
                onClick={info.toggle}
              >
                <button
                  type="button"
                  aria-label="How these percentages are calculated"
                  aria-expanded={info.open}
                  className="-m-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="end" onPointerDownOutside={() => info.setOpen(false)}>
                {explanation}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </div>
      <span className="block" ref={bar.ref}>
        <TooltipProvider delayDuration={150}>
          <Tooltip open={bar.open} onOpenChange={bar.setOpen}>
            <TooltipTrigger asChild onClick={bar.toggle}>
              <button
                type="button"
                aria-expanded={bar.open}
                aria-label={`${yes}% ${yesLabel}, ${no}% ${noLabel}. Show how this is calculated`}
                className={`mt-1.5 flex w-full cursor-help overflow-hidden rounded-full bg-secondary ${size === "lg" ? "h-3" : "h-2"}`}
              >
                <span style={{ width: `${yes}%`, backgroundColor: "var(--yes)" }} />
                <span style={{ width: `${no}%`, backgroundColor: "var(--no)" }} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" onPointerDownOutside={() => bar.setOpen(false)}>
              {explanation}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    </div>
  );
}
