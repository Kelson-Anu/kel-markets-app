UPDATE public.markets SET liquidity = 0;
ALTER TABLE public.markets ALTER COLUMN liquidity SET DEFAULT 0;