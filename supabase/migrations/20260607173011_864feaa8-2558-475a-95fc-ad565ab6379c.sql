
-- Replace combined policy with role-split policies so anon policy doesn't reference owner_id
DROP POLICY IF EXISTS "Stores are publicly viewable" ON public.stores;

CREATE POLICY "Anon can view active stores"
  ON public.stores
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL AND is_hidden = false);

CREATE POLICY "Authenticated can view stores"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND is_hidden = false)
    OR auth.uid() = owner_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );
