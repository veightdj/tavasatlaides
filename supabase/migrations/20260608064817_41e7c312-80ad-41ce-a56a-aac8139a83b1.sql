
DROP POLICY IF EXISTS "Anyone can submit a report" ON public.deal_reports;
CREATE POLICY "Anyone can submit a report" ON public.deal_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(reporter_fingerprint,'')) BETWEEN 8 AND 128
    AND (note IS NULL OR char_length(note) <= 1000)
  );

REVOKE EXECUTE ON FUNCTION public.recalculate_trust_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_deal_fraud(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_trust_score(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_deal_fraud(uuid) TO service_role;
