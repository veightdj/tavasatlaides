DROP POLICY IF EXISTS "Anyone can record a store share" ON public.store_shares;
CREATE POLICY "Record store share"
ON public.store_shares
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_shares.store_id)
  AND (NOT (user_id IS DISTINCT FROM auth.uid()))
);