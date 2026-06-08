
-- 1) Verify / block flags on stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- 2) Trust level enum
DO $$ BEGIN
  CREATE TYPE public.trust_level AS ENUM ('bronze','silver','gold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) partner_trust_scores
CREATE TABLE IF NOT EXISTS public.partner_trust_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 50,
  level public.trust_level NOT NULL DEFAULT 'bronze',
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_trust_scores TO authenticated;
GRANT ALL ON public.partner_trust_scores TO service_role;
ALTER TABLE public.partner_trust_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own trust score" ON public.partner_trust_scores
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all trust scores" ON public.partner_trust_scores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage trust scores" ON public.partner_trust_scores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) report reason enum
DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM ('spam','scam','expired','wrong_info','inappropriate','duplicate','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) deal_reports (anonymous reports allowed)
CREATE TABLE IF NOT EXISTS public.deal_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  reporter_fingerprint text,
  reporter_ip text,
  reason public.report_reason NOT NULL,
  note text,
  status public.report_status NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_reports_ad ON public.deal_reports(ad_id);
CREATE INDEX IF NOT EXISTS idx_deal_reports_status ON public.deal_reports(status);
GRANT INSERT, SELECT ON public.deal_reports TO anon;
GRANT INSERT, SELECT, UPDATE ON public.deal_reports TO authenticated;
GRANT ALL ON public.deal_reports TO service_role;
ALTER TABLE public.deal_reports ENABLE ROW LEVEL SECURITY;
-- Anyone can submit a report
CREATE POLICY "Anyone can submit a report" ON public.deal_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Admins manage
CREATE POLICY "Admins can view reports" ON public.deal_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.deal_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Partners can see reports on their own deals
CREATE POLICY "Partners can view reports on their deals" ON public.deal_reports
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
      WHERE a.id = deal_reports.ad_id AND s.owner_id = auth.uid()
    )
  );

-- 6) fraud_signals
CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  signal text NOT NULL,
  severity int NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_ad ON public.fraud_signals(ad_id);
GRANT SELECT ON public.fraud_signals TO authenticated;
GRANT ALL ON public.fraud_signals TO service_role;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all fraud signals" ON public.fraud_signals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners can view signals on their deals" ON public.fraud_signals
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
      WHERE a.id = fraud_signals.ad_id AND s.owner_id = auth.uid()
    )
  );

-- 7) Recalculate trust score for a partner
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(_user_id uuid)
RETURNS public.partner_trust_scores
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_age_days int;
  v_active_ads int;
  v_total_ads int;
  v_verified boolean;
  v_blocked boolean;
  v_reports_resolved int;
  v_fraud_high int;
  v_score int := 30;
  v_level public.trust_level;
  v_factors jsonb;
  v_row public.partner_trust_scores;
BEGIN
  SELECT GREATEST(0, EXTRACT(day FROM now() - created_at)::int)
    INTO v_account_age_days FROM auth.users WHERE id = _user_id;

  SELECT COALESCE(bool_or(is_verified),false), COALESCE(bool_or(is_blocked),false)
    INTO v_verified, v_blocked FROM public.stores WHERE owner_id = _user_id;

  SELECT COUNT(*) FILTER (WHERE a.status = 'active'), COUNT(*)
    INTO v_active_ads, v_total_ads
    FROM public.ads a JOIN public.stores s ON s.id = a.store_id
    WHERE s.owner_id = _user_id;

  SELECT COUNT(*) INTO v_reports_resolved
    FROM public.deal_reports r
    JOIN public.ads a ON a.id = r.ad_id
    JOIN public.stores s ON s.id = a.store_id
    WHERE s.owner_id = _user_id AND r.status = 'resolved'
      AND r.created_at > now() - interval '90 days';

  SELECT COUNT(*) INTO v_fraud_high
    FROM public.fraud_signals f
    JOIN public.ads a ON a.id = f.ad_id
    JOIN public.stores s ON s.id = a.store_id
    WHERE s.owner_id = _user_id AND f.severity >= 3
      AND f.created_at > now() - interval '90 days';

  IF v_account_age_days >= 30 THEN v_score := v_score + 20; END IF;
  IF v_active_ads >= 3 THEN v_score := v_score + 20; END IF;
  IF v_verified THEN v_score := v_score + 20; END IF;
  v_score := v_score - LEAST(v_reports_resolved * 10, 30);
  v_score := v_score - LEAST(v_fraud_high * 5, 20);
  IF v_blocked THEN v_score := 0; END IF;
  v_score := GREATEST(0, LEAST(100, v_score));

  v_level := CASE WHEN v_score >= 70 THEN 'gold'
                  WHEN v_score >= 40 THEN 'silver'
                  ELSE 'bronze' END;

  v_factors := jsonb_build_object(
    'account_age_days', v_account_age_days,
    'active_ads', v_active_ads,
    'total_ads', v_total_ads,
    'verified', v_verified,
    'blocked', v_blocked,
    'reports_resolved_90d', v_reports_resolved,
    'fraud_high_90d', v_fraud_high
  );

  INSERT INTO public.partner_trust_scores(user_id, score, level, factors, updated_at)
  VALUES (_user_id, v_score, v_level, v_factors, now())
  ON CONFLICT (user_id) DO UPDATE
    SET score = EXCLUDED.score, level = EXCLUDED.level,
        factors = EXCLUDED.factors, updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

-- 8) Detect basic fraud on a deal
CREATE OR REPLACE FUNCTION public.detect_deal_fraud(_ad_id uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ad public.ads%ROWTYPE;
  v_lat double precision;
  v_lng double precision;
  v_dup int;
  v_count int := 0;
BEGIN
  SELECT * INTO v_ad FROM public.ads WHERE id = _ad_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Pull geo from store
  SELECT lat, lng INTO v_lat, v_lng FROM public.stores WHERE id = v_ad.store_id;

  -- Short title
  IF length(coalesce(v_ad.title,'')) < 8 THEN
    INSERT INTO public.fraud_signals(ad_id, signal, severity, payload)
    VALUES (_ad_id, 'short_title', 2, jsonb_build_object('length', length(v_ad.title)));
    v_count := v_count + 1;
  END IF;

  -- Excessive uppercase/specials
  IF v_ad.title ~ '[!@#$%^&*]{3,}' OR (length(v_ad.title) > 10 AND v_ad.title = upper(v_ad.title)) THEN
    INSERT INTO public.fraud_signals(ad_id, signal, severity, payload)
    VALUES (_ad_id, 'spammy_title', 2, jsonb_build_object('title', v_ad.title));
    v_count := v_count + 1;
  END IF;

  -- Out of Baltics bounding box (LV/LT/EE roughly): lat 53.5–59.8, lng 20.5–28.5
  IF v_lat IS NOT NULL AND v_lng IS NOT NULL AND
     (v_lat < 53.5 OR v_lat > 59.8 OR v_lng < 20.5 OR v_lng > 28.5) THEN
    INSERT INTO public.fraud_signals(ad_id, signal, severity, payload)
    VALUES (_ad_id, 'geo_out_of_region', 3, jsonb_build_object('lat', v_lat, 'lng', v_lng));
    v_count := v_count + 1;
  END IF;

  -- Duplicate title in same store within 7 days
  SELECT COUNT(*) INTO v_dup FROM public.ads
    WHERE store_id = v_ad.store_id AND id <> v_ad.id
      AND lower(title) = lower(v_ad.title)
      AND created_at > now() - interval '7 days';
  IF v_dup > 0 THEN
    INSERT INTO public.fraud_signals(ad_id, signal, severity, payload)
    VALUES (_ad_id, 'duplicate_title_7d', 3, jsonb_build_object('matches', v_dup));
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END $$;

-- 9) Trigger fraud check on ads insert
CREATE OR REPLACE FUNCTION public.tr_ads_fraud_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.detect_deal_fraud(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ads_fraud_check ON public.ads;
CREATE TRIGGER ads_fraud_check AFTER INSERT ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.tr_ads_fraud_check();
