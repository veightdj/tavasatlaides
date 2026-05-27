ALTER TABLE public.ad_shares ADD COLUMN channel TEXT;

-- No new RLS needed; existing policies remain in effect.