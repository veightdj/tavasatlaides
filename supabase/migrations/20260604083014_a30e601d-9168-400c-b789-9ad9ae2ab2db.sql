
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','inactive','deleted'));

CREATE TABLE IF NOT EXISTS public.account_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  reason text,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.account_deletion_log TO service_role;

ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.account_deletion_log
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
