
-- 1. Add user_id columns (nullable) with default auth.uid()
ALTER TABLE public.ad_views ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE public.ad_clicks ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE public.ad_saves ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE public.ad_shares ADD COLUMN user_id uuid DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_ad_views_user ON public.ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_user ON public.ad_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_saves_user ON public.ad_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_shares_user ON public.ad_shares(user_id);

-- 2. Tighten INSERT policies: ensure inserted user_id matches auth context
DROP POLICY IF EXISTS "Anyone can record a view on active ads" ON public.ad_views;
CREATE POLICY "Record view on active ads" ON public.ad_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_views.ad_id AND a.status = 'active')
    AND user_id IS NOT DISTINCT FROM auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can record a click on active ads" ON public.ad_clicks;
CREATE POLICY "Record click on active ads" ON public.ad_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_clicks.ad_id AND a.status = 'active')
    AND user_id IS NOT DISTINCT FROM auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can record a share on active ads" ON public.ad_shares;
CREATE POLICY "Record share on active ads" ON public.ad_shares
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_shares.ad_id AND a.status = 'active')
    AND user_id IS NOT DISTINCT FROM auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can record a save on active ads" ON public.ad_saves;
CREATE POLICY "Record save on active ads" ON public.ad_saves
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_saves.ad_id AND a.status = 'active')
    AND user_id IS NOT DISTINCT FROM auth.uid()
  );

-- 3. SELECT policies: keep store-owner read; add "own saves" for users.
-- Existing "Store owners can view ..." policies remain in place.
CREATE POLICY "Users can view their own saves" ON public.ad_saves
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4. Prevent duplicate saves per user/ad (only when user_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ad_saves_user_ad
  ON public.ad_saves(ad_id, user_id) WHERE user_id IS NOT NULL;
