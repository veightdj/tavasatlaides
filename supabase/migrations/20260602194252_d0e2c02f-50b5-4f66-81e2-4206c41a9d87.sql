
-- Performance: composite & partial indexes on hot query paths
CREATE INDEX IF NOT EXISTS idx_ads_status_created ON public.ads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_status_discount ON public.ads (status, discount_pct DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ads_status_ends ON public.ads (status, ends_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ads_store ON public.ads (store_id);
CREATE INDEX IF NOT EXISTS idx_ads_category_status ON public.ads (category, status);

CREATE INDEX IF NOT EXISTS idx_ad_images_ad_sort ON public.ad_images (ad_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_ad_views_ad_time ON public.ad_views (ad_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_views_time ON public.ad_views (viewed_at);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad_time ON public.ad_clicks (ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_time ON public.ad_clicks (created_at);
CREATE INDEX IF NOT EXISTS idx_ad_saves_ad ON public.ad_saves (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_saves_user ON public.ad_saves (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_shares_ad ON public.ad_shares (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_shares_time ON public.ad_shares (created_at);
CREATE INDEX IF NOT EXISTS idx_ad_status_logs_ad_time ON public.ad_status_logs (ad_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug_unique ON public.stores (slug);
CREATE INDEX IF NOT EXISTS idx_stores_city_category ON public.stores (city, category);
CREATE INDEX IF NOT EXISTS idx_stores_geo ON public.stores (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_owner ON public.stores (owner_id);

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners (is_active, sort_order, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_store_shares_store ON public.store_shares (store_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_time ON public.notification_logs (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_time ON public.notification_logs (sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_ad ON public.notification_logs (ad_id);

-- Clean orphans then add missing FK constraints with CASCADE
DELETE FROM public.ad_clicks WHERE ad_id NOT IN (SELECT id FROM public.ads);
DELETE FROM public.ad_saves WHERE ad_id NOT IN (SELECT id FROM public.ads);
DELETE FROM public.ad_shares WHERE ad_id NOT IN (SELECT id FROM public.ads);
DELETE FROM public.ad_status_logs WHERE ad_id NOT IN (SELECT id FROM public.ads);
DELETE FROM public.store_shares WHERE store_id NOT IN (SELECT id FROM public.stores);
DELETE FROM public.notification_logs WHERE ad_id NOT IN (SELECT id FROM public.ads);

DO $$ BEGIN
  ALTER TABLE public.ad_clicks ADD CONSTRAINT ad_clicks_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ad_saves ADD CONSTRAINT ad_saves_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ad_shares ADD CONSTRAINT ad_shares_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ad_status_logs ADD CONSTRAINT ad_status_logs_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.store_shares ADD CONSTRAINT store_shares_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Retention: delete analytics rows older than 90 days (function called by cron)
CREATE OR REPLACE FUNCTION public.prune_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ad_views        WHERE viewed_at < now() - interval '90 days';
  DELETE FROM public.ad_clicks       WHERE created_at < now() - interval '90 days';
  DELETE FROM public.ad_shares       WHERE created_at < now() - interval '90 days';
  DELETE FROM public.store_shares    WHERE created_at < now() - interval '90 days';
  DELETE FROM public.notification_logs WHERE sent_at  < now() - interval '90 days';
END;
$$;

-- Enable pg_cron + pg_net so we can schedule the hourly expire + nightly prune
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hourly: auto-expire active deals past their ends_at
SELECT cron.unschedule('expire-outdated-ads-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-outdated-ads-hourly');
SELECT cron.schedule(
  'expire-outdated-ads-hourly',
  '0 * * * *',
  $$ SELECT public.expire_outdated_ads(); $$
);

-- Nightly at 03:00 UTC: prune analytics older than 90 days
SELECT cron.unschedule('prune-old-analytics-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-old-analytics-daily');
SELECT cron.schedule(
  'prune-old-analytics-daily',
  '0 3 * * *',
  $$ SELECT public.prune_old_analytics(); $$
);
