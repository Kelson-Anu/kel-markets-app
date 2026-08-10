export function SentimentBar({
  yesPrice,
  yesLabel = "For",
  noLabel = "Against",
  className = "",
  size = "sm",
}: {
  yesPrice: number;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const yes = Math.min(100, Math.max(0, Math.round(yesPrice * 100)));
  const no = 100 - yes;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs font-medium">
        <span className="num" style={{ color: "var(--yes)" }}>
          {yes}% {yesLabel}
        </span>
        <span className="num" style={{ color: "var(--no)" }}>
          {no}% {noLabel}
        </span>
      </div>
      <div
        className={`mt-1.5 flex w-full overflow-hidden rounded-full bg-secondary ${size === "lg" ? "h-3" : "h-2"}`}
        role="img"
        aria-label={`${yes}% ${yesLabel}, ${no}% ${noLabel}`}
      >
        <div style={{ width: `${yes}%`, backgroundColor: "var(--yes)" }} />
        <div style={{ width: `${no}%`, backgroundColor: "var(--no)" }} />
      </div>
    </div>
  );
}
