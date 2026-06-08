DROP POLICY IF EXISTS "Record click on active ads" ON public.ad_clicks;
CREATE POLICY "Record click on active ads" ON public.ad_clicks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_clicks.ad_id AND a.status = 'active' AND a.deleted_at IS NULL AND a.is_hidden = false)
    AND NOT (user_id IS DISTINCT FROM auth.uid())
  );

DROP POLICY IF EXISTS "Record view on active ads" ON public.ad_views;
CREATE POLICY "Record view on active ads" ON public.ad_views
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_views.ad_id AND a.status = 'active' AND a.deleted_at IS NULL AND a.is_hidden = false)
    AND NOT (user_id IS DISTINCT FROM auth.uid())
  );

DROP POLICY IF EXISTS "Record share on active ads" ON public.ad_shares;
CREATE POLICY "Record share on active ads" ON public.ad_shares
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_shares.ad_id AND a.status = 'active' AND a.deleted_at IS NULL AND a.is_hidden = false)
    AND NOT (user_id IS DISTINCT FROM auth.uid())
  );

DROP POLICY IF EXISTS "Record save on active ads" ON public.ad_saves;
CREATE POLICY "Record save on active ads" ON public.ad_saves
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_saves.ad_id AND a.status = 'active' AND a.deleted_at IS NULL AND a.is_hidden = false)
    AND NOT (user_id IS DISTINCT FROM auth.uid())
  );

REVOKE SELECT (reporter_ip, reporter_fingerprint) ON public.deal_reports FROM authenticated;
REVOKE SELECT (reporter_ip, reporter_fingerprint) ON public.deal_reports FROM anon;