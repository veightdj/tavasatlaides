-- 1) Hide stores.owner_id from anonymous (public, unauthenticated) reads via column-level grants.
--    Authenticated users still get full SELECT (needed for owner-only queries that filter by owner_id).
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (
  id, name, slug, category, description,
  address, city, postal_code, country,
  lat, lng, phone, website, hours_json,
  logo_url, cover_image_url, created_at, updated_at
) ON public.stores TO anon;

-- 2) Tighten storage SELECT policy on store-assets:
--    The bucket is public so files are still served via CDN URL; this only
--    restricts listing/enumeration via the Storage API to the owning user.
DROP POLICY IF EXISTS "Store assets viewable by direct path" ON storage.objects;

CREATE POLICY "Store assets owner can list"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );