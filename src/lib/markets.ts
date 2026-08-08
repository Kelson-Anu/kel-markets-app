export type Outcome = "YES" | "NO";

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

export const MARKETS: Market[] = [
  {
    id: "btc-150k-2026",
    question: "Will Bitcoin close above $150,000 before 2027?",
    category: "Crypto",
    description:
      "Resolves YES if the daily close of BTC/USD on the reference index exceeds $150,000 at any point before Jan 1, 2027.",
    yesPrice: 0.62,
    change24h: 4.1,
    volume: 18420000,
    liquidity: 2310000,
    closes: "Dec 31, 2026",
    history: walk(0.62, 28, 0.1),
  },
  {
    id: "fed-cut-september",
    question: "Will the Fed cut rates at the September meeting?",
    category: "Economy",
    description:
      "Resolves YES if the FOMC announces a reduction of the federal funds target range at its September meeting.",
    yesPrice: 0.38,
    change24h: -6.4,
    volume: 9240000,
    liquidity: 1120000,
    closes: "Sep 18, 2026",
    history: walk(0.38, 28, -0.12),
  },
  {
    id: "gpt6-release",
    question: "Will a frontier lab ship a model called GPT-6 this year?",
    category: "Tech",
    description: "Resolves YES on a public release announcement of a model branded GPT-6.",
    yesPrice: 0.21,
    change24h: 1.8,
    volume: 3810000,
    liquidity: 640000,
    closes: "Dec 31, 2026",
    history: walk(0.21, 28, 0.04),
  },
  {
    id: "champions-league-final",
    question: "Will Real Madrid reach the Champions League final?",
    category: "Sports",
    description: "Resolves YES if Real Madrid is one of the two clubs in the 2026/27 final.",
    yesPrice: 0.44,
    change24h: 2.6,
    volume: 6120000,
    liquidity: 880000,
    closes: "May 30, 2027",
    history: walk(0.44, 28, 0.06),
  },
  {
    id: "eu-ai-act-delay",
    question: "Will the EU delay enforcement of the AI Act?",
    category: "Politics",
    description: "Resolves YES if a formal delay to enforcement deadlines is adopted.",
    yesPrice: 0.55,
    change24h: -1.2,
    volume: 2240000,
    liquidity: 410000,
    closes: "Nov 1, 2026",
    history: walk(0.55, 28, -0.03),
  },
  {
    id: "eth-flip-btc",
    question: "Will ETH market cap exceed BTC before 2028?",
    category: "Crypto",
    description: "Resolves YES if ETH total market cap exceeds BTC for any full UTC day.",
    yesPrice: 0.08,
    change24h: -0.4,
    volume: 1470000,
    liquidity: 290000,
    closes: "Dec 31, 2027",
    history: walk(0.08, 28, -0.01),
  },
  {
    id: "album-of-the-year",
    question: "Will a debut artist win Album of the Year?",
    category: "Culture",
    description: "Resolves YES if the winning artist has no prior full-length studio album.",
    yesPrice: 0.17,
    change24h: 3.3,
    volume: 940000,
    liquidity: 180000,
    closes: "Feb 8, 2027",
    history: walk(0.17, 28, 0.05),
  },
  {
    id: "spacex-mars-window",
    question: "Will SpaceX launch an uncrewed Starship to Mars in the next window?",
    category: "Tech",
    description: "Resolves YES on a confirmed trans-Mars injection burn during the window.",
    yesPrice: 0.29,
    change24h: 7.9,
    volume: 5320000,
    liquidity: 720000,
    closes: "Jan 15, 2027",
    history: walk(0.29, 28, 0.11),
  },
  {
    id: "uk-election-called",
    question: "Will a UK general election be called before July?",
    category: "Politics",
    description: "Resolves YES if Parliament is dissolved for a general election before July 1.",
    yesPrice: 0.34,
    change24h: -3.1,
    volume: 3980000,
    liquidity: 530000,
    closes: "Jul 1, 2027",
    history: walk(0.34, 28, -0.07),
  },
];

export function getMarket(id: string) {
  return MARKETS.find((m) => m.id === id);
}

export const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
      : `$${n.toFixed(2)}`;

export const cents = (p: number) => `${Math.round(p * 100)}¢`;