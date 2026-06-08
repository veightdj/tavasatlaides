
-- Public reads (RLS policies still gate row visibility)
GRANT SELECT ON public.ads TO anon, authenticated;
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.ad_images TO anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT SELECT ON public.partner_trust_scores TO anon, authenticated;

-- Authenticated writes for owners/users (RLS enforces ownership)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_saves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT ON public.deal_reports TO authenticated;
GRANT SELECT, INSERT ON public.ad_clicks TO anon, authenticated;
GRANT SELECT, INSERT ON public.ad_views TO anon, authenticated;
GRANT SELECT, INSERT ON public.ad_shares TO anon, authenticated;
GRANT SELECT, INSERT ON public.store_shares TO anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.ad_status_logs TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;

-- Service role gets full access on all public tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
