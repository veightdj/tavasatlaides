
-- Tighten anon ad_views policy: only allow inserts for currently active ads
DROP POLICY "Anyone can record an ad view" ON public.ad_views;
CREATE POLICY "Anyone can record a view on active ads" ON public.ad_views
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_id AND a.status = 'active')
  );

-- Tighten storage SELECT: must include a folder segment (prevents top-level listing)
DROP POLICY "Store assets are publicly viewable" ON storage.objects;
CREATE POLICY "Store assets viewable by direct path" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

-- Lock down SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
