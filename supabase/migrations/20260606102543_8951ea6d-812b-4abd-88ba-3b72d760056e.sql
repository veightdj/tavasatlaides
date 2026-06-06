
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;
CREATE POLICY "Stores are publicly viewable" ON public.stores
FOR SELECT USING (
  (deleted_at IS NULL AND is_hidden = false)
  OR auth.uid() = owner_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Active ads are publicly viewable" ON public.ads;
CREATE POLICY "Active ads are publicly viewable" ON public.ads
FOR SELECT USING (
  (status = 'active' AND deleted_at IS NULL AND is_hidden = false)
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ads.store_id AND s.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can update any store" ON public.stores;
CREATE POLICY "Admins can update any store" ON public.stores
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any store" ON public.stores;
CREATE POLICY "Admins can delete any store" ON public.stores
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any ad" ON public.ads;
CREATE POLICY "Admins can update any ad" ON public.ads
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any ad" ON public.ads;
CREATE POLICY "Admins can delete any ad" ON public.ads
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS stores_deleted_at_idx ON public.stores(deleted_at);
CREATE INDEX IF NOT EXISTS ads_deleted_at_idx ON public.ads(deleted_at);
