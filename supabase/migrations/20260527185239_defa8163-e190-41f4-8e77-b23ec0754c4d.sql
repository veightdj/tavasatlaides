CREATE TABLE public.store_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  user_id UUID DEFAULT auth.uid(),
  channel TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.store_shares TO anon;
GRANT INSERT, SELECT ON public.store_shares TO authenticated;
GRANT ALL ON public.store_shares TO service_role;

ALTER TABLE public.store_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a store share"
ON public.store_shares
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Store owners can view their store shares"
ON public.store_shares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = store_shares.store_id AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own shares"
ON public.store_shares
FOR SELECT
TO authenticated
USING (user_id = auth.uid());