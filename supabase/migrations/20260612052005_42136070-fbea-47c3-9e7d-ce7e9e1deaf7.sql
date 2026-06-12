
DROP POLICY IF EXISTS "Users can self-assign client or partner role" ON public.user_roles;
CREATE POLICY "Users can self-assign client or partner role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND role IN ('client'::public.app_role, 'partner'::public.app_role)
);
