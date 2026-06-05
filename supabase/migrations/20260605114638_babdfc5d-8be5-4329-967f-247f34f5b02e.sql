-- Restrictive deny policies on account_deletion_log: only service_role may access.
CREATE POLICY "Deny anon access to deletion log"
ON public.account_deletion_log
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny authenticated access to deletion log"
ON public.account_deletion_log
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);