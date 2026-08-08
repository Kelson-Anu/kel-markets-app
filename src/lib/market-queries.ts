import { queryOptions } from "@tanstack/react-query";
import { listPublicMarkets, getPublicMarket, listAllMarkets, getAdminStatus } from "./markets.functions";

export const marketsQuery = queryOptions({
  queryKey: ["markets", "public"],
  queryFn: () => listPublicMarkets(),
});

export const marketQuery = (id: string) =>
  queryOptions({
    queryKey: ["markets", "public", id],
    queryFn: () => getPublicMarket({ data: { id } }),
  });

export const adminMarketsQuery = queryOptions({
  queryKey: ["markets", "admin"],
  queryFn: () => listAllMarkets(),
});

export const adminStatusQuery = queryOptions({
  queryKey: ["admin", "status"],
  queryFn: () => getAdminStatus(),
});
