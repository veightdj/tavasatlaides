
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  radius_km integer NOT NULL DEFAULT 3 CHECK (radius_km IN (1, 3, 5)),
  categories text[] NOT NULL DEFAULT ARRAY['food','auto','beauty','electronics','home','kids','cafes','events']::text[],
  quiet_start smallint NOT NULL DEFAULT 22 CHECK (quiet_start BETWEEN 0 AND 23),
  quiet_end smallint NOT NULL DEFAULT 8 CHECK (quiet_end BETWEEN 0 AND 23),
  max_per_day integer NOT NULL DEFAULT 5 CHECK (max_per_day BETWEEN 1 AND 50),
  sound_vibration boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ad_id uuid NOT NULL,
  distance_m integer,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_logs_user_sent ON public.notification_logs (user_id, sent_at DESC);
CREATE INDEX idx_notif_logs_user_ad ON public.notification_logs (user_id, ad_id);

GRANT SELECT, INSERT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs" ON public.notification_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logs" ON public.notification_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
