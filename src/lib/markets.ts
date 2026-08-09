export type Outcome = "YES" | "NO";

export type PriceDisplay = "cents" | "percent" | "odds";

export type Market = {
  id: string;
  question: string;
  category: string;
  description: string;
  yesPrice: number; // 0..1
  change24h: number; // percentage points
  volume: number;
  liquidity: number;
  closes: string;
  history: number[];
  status: "draft" | "published";
  resolution: "YES" | "NO" | null;
  tags: string[];
  yesLabel: string;
  noLabel: string;
  priceDisplay: PriceDisplay;
};

export const CATEGORIES = [
  "All",
  "Politics",
  "Crypto",
  "Sports",
  "Tech",
  "Culture",
  "Economy",
] as const;

export const MARKET_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

export function walk(start: number, n = 28, drift = 0): number[] {
  const out: number[] = [];
  let v = start;
  let seed = Math.round(start * 10000);
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const r = (seed / 2147483648 - 0.5) * 0.07 + drift / n;
    v = Math.min(0.97, Math.max(0.03, v + r));
    out.push(Number(v.toFixed(3)));
  }
  out[out.length - 1] = start;
  return out;
}

export const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
      : `$${n.toFixed(2)}`;

export const cents = (p: number) => `${Math.round(p * 100)}¢`;

export const PRICE_DISPLAYS: { value: PriceDisplay; label: string; example: string }[] = [
  { value: "cents", label: "Cents", example: "62¢" },
  { value: "percent", label: "Percent chance", example: "62%" },
  { value: "odds", label: "Decimal odds", example: "1.61x" },
];

export function priceLabel(p: number, display: PriceDisplay = "cents") {
  if (display === "percent") return `${Math.round(p * 100)}%`;
  if (display === "odds") return `${(1 / Math.max(0.01, p)).toFixed(2)}x`;
  return cents(p);
}

export type MarketRow = {
  id: string;
  question: string;
  category: string;
  description: string;
  yes_price: number | string;
  change_24h: number | string;
  volume: number | string;
  liquidity: number | string;
  closes: string;
  history: unknown;
  status: string;
  resolution: string | null;
  tags?: string[] | null;
  yes_label?: string | null;
  no_label?: string | null;
  price_display?: string | null;
};

export function fromRow(row: MarketRow): Market {
  return {
    id: row.id,
    question: row.question,
    category: row.category,
    description: row.description,
    yesPrice: Number(row.yes_price),
    change24h: Number(row.change_24h),
    volume: Number(row.volume),
    liquidity: Number(row.liquidity),
    closes: row.closes,
    history: Array.isArray(row.history) ? (row.history as number[]).map(Number) : [],
    status: row.status === "published" ? "published" : "draft",
    resolution: row.resolution === "YES" || row.resolution === "NO" ? row.resolution : null,
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean).map(String) : [],
    yesLabel: row.yes_label?.trim() || "Yes",
    noLabel: row.no_label?.trim() || "No",
    priceDisplay:
      row.price_display === "percent" || row.price_display === "odds"
        ? row.price_display
        : "cents",
  };
}

export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean),
    ),
  ).slice(0, 8);
}
