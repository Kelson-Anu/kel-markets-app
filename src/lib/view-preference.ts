import { useCallback, useEffect, useState } from "react";

export type MarketView = "sentiment" | "chart";

const KEY = "kelmarket.marketView.v1";
const listeners = new Set<() => void>();

function read(): MarketView {
  if (typeof window === "undefined") return "sentiment";
  return window.localStorage.getItem(KEY) === "chart" ? "chart" : "sentiment";
}

export function hasChartData(history: number[] | undefined | null) {
  return Array.isArray(history) && history.length > 1;
}

export function useMarketView() {
  const [view, setView] = useState<MarketView>("sentiment");
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => setView(read()), []);

  useEffect(() => {
    sync();
    setReady(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [sync]);

  const setMarketView = useCallback((next: MarketView) => {
    window.localStorage.setItem(KEY, next);
    listeners.forEach((l) => l());
  }, []);

  return { view, ready, setMarketView };
}
