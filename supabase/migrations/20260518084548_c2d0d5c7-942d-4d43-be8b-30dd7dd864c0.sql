
-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============ stores ============
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  logo_url TEXT,
  description TEXT,
  hours_json JSONB,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE INDEX stores_owner_idx ON public.stores(owner_id);
CREATE INDEX stores_city_idx ON public.stores(city);

CREATE POLICY "Stores are publicly viewable" ON public.stores
  FOR SELECT USING (true);
CREATE POLICY "Owners can insert their store" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their store" ON public.stores
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their store" ON public.stores
  FOR DELETE USING (auth.uid() = owner_id);

-- ============ ads ============
CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  discount_pct INTEGER,
  price_original NUMERIC(10,2),
  price_sale NUMERIC(10,2),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | draft
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE INDEX ads_store_idx ON public.ads(store_id);
CREATE INDEX ads_status_idx ON public.ads(status);
CREATE INDEX ads_ends_at_idx ON public.ads(ends_at);

-- Public can view active ads OR ads they own
CREATE POLICY "Active ads are publicly viewable" ON public.ads
  FOR SELECT USING (
    status = 'active'
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = ads.store_id AND s.owner_id = auth.uid()
    )
  );
CREATE POLICY "Store owners can insert ads" ON public.ads
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Store owners can update ads" ON public.ads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Store owners can delete ads" ON public.ads
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  );

-- ============ ad_images ============
CREATE TABLE public.ad_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX ad_images_ad_idx ON public.ad_images(ad_id);

CREATE POLICY "Ad images are publicly viewable" ON public.ad_images
  FOR SELECT USING (true);
CREATE POLICY "Store owners can insert ad images" ON public.ad_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
      WHERE a.id = ad_id AND s.owner_id = auth.uid()
    )
  );
CREATE POLICY "Store owners can delete ad images" ON public.ad_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
      WHERE a.id = ad_id AND s.owner_id = auth.uid()
    )
  );

-- ============ ad_views ============
CREATE TABLE public.ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX ad_views_ad_idx ON public.ad_views(ad_id);

CREATE POLICY "Anyone can record an ad view" ON public.ad_views
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Store owners can view their ad views" ON public.ad_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ads a JOIN public.stores s ON s.id = a.store_id
      WHERE a.id = ad_views.ad_id AND s.owner_id = auth.uid()
    )
  );

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ads_updated BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ profile auto-create on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Store assets are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-assets');
CREATE POLICY "Authenticated users can upload to their folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'store-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can update their own store assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'store-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can delete their own store assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'store-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
