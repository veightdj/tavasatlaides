
-- 1. Fix ad_images SELECT policy to mirror ads visibility
DROP POLICY IF EXISTS "Ad images are publicly viewable" ON public.ad_images;

CREATE POLICY "Ad images viewable for active ads or by owner"
ON public.ad_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ads a
    LEFT JOIN public.stores s ON s.id = a.store_id
    WHERE a.id = ad_images.ad_id
      AND (a.status = 'active' OR s.owner_id = auth.uid())
  )
);

-- 2. Restrict Realtime channel subscriptions to store owners
-- Channel naming convention: "ads:<ad_id>" — owners subscribe to their own ads only.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can subscribe to their ad channels" ON realtime.messages;

CREATE POLICY "Store owners can subscribe to their ad channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ads a
    JOIN public.stores s ON s.id = a.store_id
    WHERE s.owner_id = auth.uid()
      AND realtime.topic() = 'ads:' || a.id::text
  )
);
