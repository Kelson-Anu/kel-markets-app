import { useMarketView, type MarketView } from "@/lib/view-preference";

const OPTIONS: { value: MarketView; label: string }[] = [
  { value: "sentiment", label: "Split" },
  { value: "chart", label: "Chart" },
];

export function MarketViewToggle() {
  const { view, setMarketView } = useMarketView();
  return (
    <div
      className="hidden items-center rounded-md border border-border p-0.5 md:flex"
      role="group"
      aria-label="Market display style"
    >
      {OPTIONS.map((o) => {
        const active = view === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setMarketView(o.value)}
            aria-pressed={active}
            className={`rounded-[5px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest transition-colors ${
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
