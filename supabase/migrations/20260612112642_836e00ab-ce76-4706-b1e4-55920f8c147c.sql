CREATE TABLE public.store_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_gallery_store_sort ON public.store_gallery(store_id, sort_order);

GRANT SELECT ON public.store_gallery TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_gallery TO authenticated;
GRANT ALL ON public.store_gallery TO service_role;

ALTER TABLE public.store_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store gallery"
  ON public.store_gallery FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert gallery images"
  ON public.store_gallery FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners can update gallery images"
  ON public.store_gallery FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners can delete gallery images"
  ON public.store_gallery FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );