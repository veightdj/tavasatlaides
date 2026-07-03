
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS title_lv text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_ru text,
  ADD COLUMN IF NOT EXISTS description_lv text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ru text;

UPDATE public.ads SET title_lv = COALESCE(title_lv, title) WHERE title_lv IS NULL;
UPDATE public.ads SET description_lv = COALESCE(description_lv, description) WHERE description_lv IS NULL AND description IS NOT NULL;

ALTER TABLE public.ads ALTER COLUMN title_lv SET NOT NULL;
