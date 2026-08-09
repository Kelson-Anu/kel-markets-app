ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS yes_label text NOT NULL DEFAULT 'Yes',
  ADD COLUMN IF NOT EXISTS no_label text NOT NULL DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS price_display text NOT NULL DEFAULT 'cents';

ALTER TABLE public.markets
  ADD CONSTRAINT markets_price_display_check CHECK (price_display IN ('cents','percent','odds'));