
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (
  id, name, slug, description, logo_url, cover_image_url, category, city, address,
  country, postal_code, lat, lng, phone, website, hours_json, is_hidden, deleted_at,
  is_verified, is_blocked, created_at, updated_at
) ON public.stores TO anon;

REVOKE SELECT (reporter_ip, reporter_fingerprint) ON public.deal_reports FROM authenticated;

CREATE POLICY "Users delete own pending notifications"
  ON public.pending_deal_notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Record store share" ON public.store_shares;
CREATE POLICY "Record store share"
  ON public.store_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_shares.store_id
        AND s.deleted_at IS NULL
        AND s.is_hidden = false
    )
    AND NOT (user_id IS DISTINCT FROM auth.uid())
  );
