
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS registration_number text;
