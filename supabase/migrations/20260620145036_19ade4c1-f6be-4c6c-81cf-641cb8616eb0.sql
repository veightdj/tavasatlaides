-- Subscription plan & partner status enums
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('bronze','silver','gold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_status AS ENUM ('pending_activation','active','managed_by_admin','suspended','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_plan NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS partner_status public.partner_status NOT NULL DEFAULT 'pending_activation';

CREATE INDEX IF NOT EXISTS idx_stores_partner_status ON public.stores(partner_status);
CREATE INDEX IF NOT EXISTS idx_stores_subscription_plan ON public.stores(subscription_plan);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid,
  target_store_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_id);