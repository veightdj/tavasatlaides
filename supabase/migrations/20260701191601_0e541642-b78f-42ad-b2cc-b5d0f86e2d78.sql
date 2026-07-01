CREATE POLICY "Users can delete their own saves" ON public.ad_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prefs" ON public.notification_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);