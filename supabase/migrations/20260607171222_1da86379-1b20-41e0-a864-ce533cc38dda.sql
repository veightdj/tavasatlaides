
-- 1) Restrict anon SELECT on stores so owner_id is not exposed
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (id, name, slug, category, address, city, lat, lng, logo_url, description,
              hours_json, phone, website, created_at, updated_at, cover_image_url,
              postal_code, country, is_hidden, deleted_at)
  ON public.stores TO anon;

-- Same hardening for authenticated (owner_id still readable via SECURITY DEFINER functions if needed)
REVOKE SELECT ON public.stores FROM authenticated;
GRANT SELECT (id, owner_id, name, slug, category, address, city, lat, lng, logo_url, description,
              hours_json, phone, website, created_at, updated_at, cover_image_url,
              postal_code, country, is_hidden, deleted_at)
  ON public.stores TO authenticated;

-- 2) Add restrictive deny policies on notification_events for anon and non-admin authenticated
CREATE POLICY "Deny anon all on notification_events"
  ON public.notification_events
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny non-admin authenticated writes on notification_events"
  ON public.notification_events
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Add restrictive deny policies on notification_history for anon and non-admin authenticated
CREATE POLICY "Deny anon all on notification_history"
  ON public.notification_history
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny non-admin authenticated on notification_history"
  ON public.notification_history
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Revoke EXECUTE on SECURITY DEFINER functions that should never be called by clients.
--    has_role is intentionally callable by authenticated/anon (RLS policies reference it),
--    so it is left as-is.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_outdated_ads() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_old_analytics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
