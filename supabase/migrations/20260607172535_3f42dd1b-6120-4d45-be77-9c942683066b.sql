
-- 1) Hide stores.owner_id from anonymous users via column-level privilege
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (
  id, name, slug, category, address, city, postal_code, country,
  lat, lng, description, hours_json, phone, website, logo_url,
  cover_image_url, is_hidden, deleted_at, created_at, updated_at
) ON public.stores TO anon;

-- 2) Lock down writes to user_roles (privilege escalation prevention)
CREATE POLICY "Deny anon all on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny authenticated writes on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny authenticated updates on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny authenticated deletes on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);
