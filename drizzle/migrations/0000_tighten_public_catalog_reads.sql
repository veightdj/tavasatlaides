DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;
CREATE POLICY "Active categories are publicly readable" ON public.categories
FOR SELECT TO anon, authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view store gallery" ON public.store_gallery;
CREATE POLICY "Gallery of visible stores is readable" ON public.store_gallery
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = store_gallery.store_id
    AND ((s.is_hidden = false AND s.is_blocked = false AND s.deleted_at IS NULL)
         OR s.owner_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin'))
));