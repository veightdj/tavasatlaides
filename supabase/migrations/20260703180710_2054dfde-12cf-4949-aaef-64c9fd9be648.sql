ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_lv text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ru text;

UPDATE public.categories SET
  name_lv = COALESCE(name_lv, name),
  name_en = COALESCE(name_en, CASE slug
    WHEN 'food' THEN 'Food' WHEN 'auto' THEN 'Auto' WHEN 'beauty' THEN 'Beauty'
    WHEN 'electronics' THEN 'Electronics' WHEN 'home' THEN 'Home' WHEN 'kids' THEN 'Kids'
    WHEN 'cafes' THEN 'Cafes' WHEN 'events' THEN 'Events'
    WHEN 'dzivnieki' THEN 'Pets' WHEN 'veikali' THEN 'Shops' WHEN 'sports' THEN 'Sports'
  END),
  name_ru = COALESCE(name_ru, CASE slug
    WHEN 'food' THEN 'Еда' WHEN 'auto' THEN 'Авто' WHEN 'beauty' THEN 'Красота'
    WHEN 'electronics' THEN 'Электроника' WHEN 'home' THEN 'Для дома' WHEN 'kids' THEN 'Детям'
    WHEN 'cafes' THEN 'Кафе' WHEN 'events' THEN 'События'
    WHEN 'dzivnieki' THEN 'Животные' WHEN 'veikali' THEN 'Магазины' WHEN 'sports' THEN 'Спорт'
  END);

ALTER TABLE public.categories ALTER COLUMN name_lv SET NOT NULL;