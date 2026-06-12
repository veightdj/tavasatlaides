CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'Tag',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categories (name, slug, icon, sort_order, active) VALUES
  ('Ēdiens', 'food', 'UtensilsCrossed', 10, true),
  ('Auto', 'auto', 'Car', 20, true),
  ('Skaistums', 'beauty', 'Gem', 30, true),
  ('Elektronika', 'electronics', 'Smartphone', 40, true),
  ('Mājai', 'home', 'Home', 50, true),
  ('Bērniem', 'kids', 'Baby', 60, true),
  ('Kafejnīcas', 'cafes', 'Coffee', 70, true),
  ('Pasākumi', 'events', 'CalendarDays', 80, true)
ON CONFLICT (slug) DO NOTHING;