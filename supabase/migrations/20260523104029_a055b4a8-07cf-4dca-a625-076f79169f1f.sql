
-- Tracking tables for ad engagement metrics
CREATE TABLE public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_clicks_ad_id ON public.ad_clicks(ad_id);
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a click on active ads"
  ON public.ad_clicks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_clicks.ad_id AND a.status = 'active'));

CREATE POLICY "Store owners can view their ad clicks"
  ON public.ad_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
                 WHERE a.id = ad_clicks.ad_id AND s.owner_id = auth.uid()));

CREATE TABLE public.ad_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_saves_ad_id ON public.ad_saves(ad_id);
ALTER TABLE public.ad_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a save on active ads"
  ON public.ad_saves FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_saves.ad_id AND a.status = 'active'));

CREATE POLICY "Store owners can view their ad saves"
  ON public.ad_saves FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
                 WHERE a.id = ad_saves.ad_id AND s.owner_id = auth.uid()));

CREATE TABLE public.ad_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_shares_ad_id ON public.ad_shares(ad_id);
ALTER TABLE public.ad_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a share on active ads"
  ON public.ad_shares FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_shares.ad_id AND a.status = 'active'));

CREATE POLICY "Store owners can view their ad shares"
  ON public.ad_shares FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
                 WHERE a.id = ad_shares.ad_id AND s.owner_id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_clicks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_saves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_shares;
