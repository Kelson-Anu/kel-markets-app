import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps market-derived views (pool split, payouts, liquidity) in sync with the
 * database by refetching market queries whenever a market row changes.
 */
export function useMarketRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("markets-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["markets"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
