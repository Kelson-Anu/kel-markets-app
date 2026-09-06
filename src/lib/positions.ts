import { useCallback, useEffect, useState } from "react";
import type { Outcome } from "./markets";

export type Position = {
  id: string;
  marketId: string;
  outcome: Outcome;
  shares: number;
  avgPrice: number;
  cost: number;
  at: number;
};

export type TradeEvent = {
  id: string;
  marketId: string;
  outcome: Outcome;
  kind: "open" | "close";
  shares: number;
  price: number;
  amount: number;
  pnl?: number;
  at: number;
};

const KEY = "kelmarkets.positions.v1";
const BALANCE_KEY = "kelmarkets.balance.v1";
const HISTORY_KEY = "kelmarkets.history.v1";
const START_BALANCE = 1000;

function read(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Position[];
  } catch {
    return [];
  }
}

function readHistory(): TradeEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as TradeEvent[];
  } catch {
    return [];
  }
}

function pushHistory(event: TradeEvent) {
  const next = [event, ...readHistory()].slice(0, 200);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function readBalance(): number {
  if (typeof window === "undefined") return START_BALANCE;
  const raw = window.localStorage.getItem(BALANCE_KEY);
  return raw === null ? START_BALANCE : Number(raw);
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());


export function usePortfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState(START_BALANCE);
  const [history, setHistory] = useState<TradeEvent[]>([]);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setPositions(read());
    setBalance(readBalance());
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    sync();
    setReady(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [sync]);

  const trade = useCallback(
    (marketId: string, outcome: Outcome, price: number, amount: number) => {
      const current = read();
      const bal = readBalance();
      if (amount <= 0 || amount > bal) return false;
      const shares = amount / price;
      const existing = current.find((p) => p.marketId === marketId && p.outcome === outcome);
      let next: Position[];
      if (existing) {
        const totalShares = existing.shares + shares;
        next = current.map((p) =>
          p === existing
            ? {
                ...p,
                shares: totalShares,
                cost: p.cost + amount,
                avgPrice: (p.cost + amount) / totalShares,
                at: Date.now(),
              }
            : p,
        );
      } else {
        next = [
          ...current,
          {
            id: `${marketId}-${outcome}-${Date.now()}`,
            marketId,
            outcome,
            shares,
            avgPrice: price,
            cost: amount,
            at: Date.now(),
          },
        ];
      }
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.localStorage.setItem(BALANCE_KEY, String(bal - amount));
      pushHistory({
        id: `h-${marketId}-${Date.now()}`,
        marketId,
        outcome,
        kind: "open",
        shares,
        price,
        amount,
        at: Date.now(),
      });
      emit();
      return true;
    },
    [],
  );

  const close = useCallback((positionId: string, price: number) => {
    const current = read();
    const pos = current.find((p) => p.id === positionId);
    if (!pos) return;
    const proceeds = pos.shares * price;
    window.localStorage.setItem(KEY, JSON.stringify(current.filter((p) => p.id !== positionId)));
    window.localStorage.setItem(BALANCE_KEY, String(readBalance() + proceeds));
    pushHistory({
      id: `h-${pos.marketId}-${Date.now()}`,
      marketId: pos.marketId,
      outcome: pos.outcome,
      kind: "close",
      shares: pos.shares,
      price,
      amount: proceeds,
      pnl: proceeds - pos.cost,
      at: Date.now(),
    });
    emit();
  }, []);

  /**
   * Settle every open position on a resolved market: winning shares pay out
   * $1 each, losing shares expire worthless. Idempotent per market.
   */
  const settle = useCallback((marketId: string, resolution: Outcome) => {
    const current = read();
    const affected = current.filter((p) => p.marketId === marketId);
    if (affected.length === 0) return 0;
    let credited = 0;
    for (const pos of affected) {
      const won = pos.outcome === resolution;
      const proceeds = won ? pos.shares : 0;
      credited += proceeds;
      pushHistory({
        id: `h-${pos.marketId}-${pos.outcome}-settle-${Date.now()}`,
        marketId: pos.marketId,
        outcome: pos.outcome,
        kind: "close",
        shares: pos.shares,
        price: won ? 1 : 0,
        amount: proceeds,
        pnl: proceeds - pos.cost,
        at: Date.now(),
      });
    }
    window.localStorage.setItem(
      KEY,
      JSON.stringify(current.filter((p) => p.marketId !== marketId)),
    );
    window.localStorage.setItem(BALANCE_KEY, String(readBalance() + credited));
    emit();
    return affected.length;
  }, []);

  const reset = useCallback(() => {
    window.localStorage.setItem(KEY, "[]");
    window.localStorage.setItem(BALANCE_KEY, String(START_BALANCE));
    window.localStorage.setItem(HISTORY_KEY, "[]");
    emit();
  }, []);

  return { positions, balance, history, ready, trade, close, reset };
}
