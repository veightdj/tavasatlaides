ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Latvia';