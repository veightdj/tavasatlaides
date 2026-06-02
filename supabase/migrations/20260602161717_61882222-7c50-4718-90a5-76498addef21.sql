
-- Audit log for ad status changes
CREATE TABLE IF NOT EXISTS public.ad_status_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_status_logs TO authenticated;
GRANT ALL ON public.ad_status_logs TO service_role;

ALTER TABLE public.ad_status_logs ENABLE ROW LEVEL SECURITY;

-- Store owners can view logs for their own ads
CREATE POLICY "Store owners can view their ad status logs"
ON public.ad_status_logs
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ads a
  JOIN public.stores s ON s.id = a.store_id
  WHERE a.id = ad_status_logs.ad_id AND s.owner_id = auth.uid()
));

-- Admins can view all
CREATE POLICY "Admins can view all ad status logs"
ON public.ad_status_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ad_status_logs_ad_id ON public.ad_status_logs(ad_id);
CREATE INDEX IF NOT EXISTS idx_ads_status_ends_at ON public.ads(status, ends_at);

-- Function: expire ads whose ends_at has passed
CREATE OR REPLACE FUNCTION public.expire_outdated_ads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer := 0;
  rec record;
BEGIN
  FOR rec IN
    UPDATE public.ads
    SET status = 'draft', updated_at = now()
    WHERE status = 'active'
      AND ends_at IS NOT NULL
      AND ends_at <= now()
    RETURNING id, 'active' AS old_status, 'draft' AS new_status
  LOOP
    INSERT INTO public.ad_status_logs (ad_id, old_status, new_status, reason)
    VALUES (rec.id, rec.old_status, rec.new_status, 'auto_expired');
    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$$;

-- Enable pg_cron and schedule hourly
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any prior schedule with this name
DO $$
BEGIN
  PERFORM cron.unschedule('expire-outdated-ads-hourly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-outdated-ads-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-outdated-ads-hourly',
  '0 * * * *',
  $$ SELECT public.expire_outdated_ads(); $$
);

-- Run once immediately to clean up existing expired active ads
SELECT public.expire_outdated_ads();
