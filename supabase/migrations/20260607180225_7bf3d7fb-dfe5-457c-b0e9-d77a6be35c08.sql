
-- 1. Add new pref columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT NOT NULL DEFAULT 'instant'
    CHECK (notification_frequency IN ('instant','daily_1','daily_2','daily_3')),
  ADD COLUMN IF NOT EXISTS radius_m INTEGER,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Backfill radius_m from existing radius_km (NULL stays NULL = unlimited)
UPDATE public.notification_preferences
   SET radius_m = radius_km * 1000
 WHERE radius_m IS NULL AND radius_km IS NOT NULL;

-- 2. Pending queue for daily-summary frequency
CREATE TABLE IF NOT EXISTS public.pending_deal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL,
  distance_m INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ad_id)
);
CREATE INDEX IF NOT EXISTS pending_deal_notif_user_idx
  ON public.pending_deal_notifications(user_id, created_at);

GRANT SELECT ON public.pending_deal_notifications TO authenticated;
GRANT ALL ON public.pending_deal_notifications TO service_role;
ALTER TABLE public.pending_deal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pending notifications"
  ON public.pending_deal_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Haversine helper (meters)
CREATE OR REPLACE FUNCTION public.haversine_m(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT 6371000 * 2 * asin(sqrt(
    sin(radians((lat2 - lat1) / 2))^2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians((lon2 - lon1) / 2))^2
  ));
$$;

-- 4. Trigger: when a new active ad is inserted, notify dispatch endpoint via pg_net.
-- The endpoint URL and apikey live in app_settings to keep the migration generic.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
GRANT SELECT ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only app_settings"
  ON public.app_settings FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.notify_new_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  endpoint TEXT;
  api_key TEXT;
BEGIN
  IF NEW.status <> 'active' OR COALESCE(NEW.is_hidden,false) OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT value INTO endpoint FROM public.app_settings WHERE key = 'deal_dispatch_url';
  SELECT value INTO api_key FROM public.app_settings WHERE key = 'deal_dispatch_apikey';
  IF endpoint IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := endpoint,
    headers := jsonb_build_object('Content-Type','application/json','apikey', COALESCE(api_key,'')),
    body := jsonb_build_object('ad_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_deal ON public.ads;
CREATE TRIGGER trg_notify_new_deal
  AFTER INSERT ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_deal();
