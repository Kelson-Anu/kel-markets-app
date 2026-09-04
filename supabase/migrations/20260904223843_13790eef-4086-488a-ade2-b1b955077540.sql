ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS market_type text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_url_2 text,
  ADD COLUMN IF NOT EXISTS extra_questions jsonb NOT NULL DEFAULT '[]'::jsonb;