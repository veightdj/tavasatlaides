
-- Extend notification_preferences with new category booleans and update radius default
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS new_deals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS favorite_businesses boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS expiring_deals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS special_offers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS announcements boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nearby_deals boolean NOT NULL DEFAULT true;

-- user_subscriptions (OneSignal multi-device)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_subscription_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web','ios','android')),
  device_label text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (onesignal_subscription_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions"
  ON public.user_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read all subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS user_subscriptions_user_idx ON public.user_subscriptions(user_id) WHERE is_active;

-- notification_history (admin-composed sends + auto sends)
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  target_type text NOT NULL CHECK (target_type IN ('all','city','category','business','radius','segment','auto')),
  target_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  onesignal_notification_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','scheduled','pending','sent','failed','cancelled')),
  recipients integer,
  scheduled_for timestamptz,
  sent_at timestamptz,
  is_draft boolean NOT NULL DEFAULT false,
  dedup_key text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_history TO authenticated;
GRANT ALL ON public.notification_history TO service_role;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification history"
  ON public.notification_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_notification_history_updated_at
  BEFORE UPDATE ON public.notification_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX IF NOT EXISTS notification_history_dedup_idx
  ON public.notification_history(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_history_sent_at_idx
  ON public.notification_history(sent_at DESC);

-- notification_events (OneSignal webhook mirror)
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onesignal_notification_id text NOT NULL,
  subscription_id text,
  external_user_id text,
  event text NOT NULL CHECK (event IN ('sent','delivered','clicked','dismissed','failed')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification events"
  ON public.notification_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS notification_events_notif_idx
  ON public.notification_events(onesignal_notification_id);
