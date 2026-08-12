ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS yes_pool numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_pool numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yes_bettors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_bettors integer NOT NULL DEFAULT 0;

UPDATE public.markets
  SET yes_pool = 0, no_pool = 0, yes_bettors = 0, no_bettors = 0,
      volume = 0, liquidity = 0, change_24h = 0, yes_price = 0.5;

CREATE OR REPLACE FUNCTION public.place_bet(_market_id text, _side text, _amount numeric)
RETURNS TABLE (yes_pool numeric, no_pool numeric, yes_bettors integer, no_bettors integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _side NOT IN ('YES','NO') THEN
    RAISE EXCEPTION 'Invalid side';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  RETURN QUERY
  UPDATE public.markets m
     SET yes_pool = m.yes_pool + CASE WHEN _side = 'YES' THEN _amount ELSE 0 END,
         no_pool  = m.no_pool  + CASE WHEN _side = 'NO'  THEN _amount ELSE 0 END,
         yes_bettors = m.yes_bettors + CASE WHEN _side = 'YES' THEN 1 ELSE 0 END,
         no_bettors  = m.no_bettors  + CASE WHEN _side = 'NO'  THEN 1 ELSE 0 END,
         volume = m.volume + _amount,
         yes_price = CASE
           WHEN (m.yes_pool + CASE WHEN _side = 'YES' THEN _amount ELSE 0 END
                 + m.no_pool + CASE WHEN _side = 'NO' THEN _amount ELSE 0 END) = 0 THEN 0.5
           ELSE (m.yes_pool + CASE WHEN _side = 'YES' THEN _amount ELSE 0 END)
                / (m.yes_pool + m.no_pool + _amount)
         END
   WHERE m.id = _market_id AND m.status = 'published' AND m.resolution IS NULL
  RETURNING m.yes_pool, m.no_pool, m.yes_bettors, m.no_bettors;
END;
$$;

REVOKE ALL ON FUNCTION public.place_bet(text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.place_bet(text, text, numeric) TO anon, authenticated, service_role;