import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORY_SLUGS } from "@/lib/categories";

const CategorySchema = z.enum(CATEGORY_SLUGS as unknown as [string, ...string[]]);

const PrefsSchema = z.object({
  enabled: z.boolean(),
  radiusM: z.union([z.literal(500), z.literal(1000), z.literal(3000), z.literal(5000), z.null()]),
  frequency: z.enum(["instant", "daily_1", "daily_2", "daily_3"]),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  categories: z.array(CategorySchema).min(0).max(32),
  quietStart: z.number().int().min(0).max(23),
  quietEnd: z.number().int().min(0).max(23),
  soundVibration: z.boolean(),
  newDeals: z.boolean(),
  favoriteBusinesses: z.boolean(),
  expiringDeals: z.boolean(),
  specialOffers: z.boolean(),
  announcements: z.boolean(),
  nearbyDeals: z.boolean(),
});

export type ServerNotificationPrefs = z.infer<typeof PrefsSchema>;

export const loadNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      enabled: data.enabled,
      radiusM: (data as any).radius_m ?? (data.radius_km ? data.radius_km * 1000 : null),
      frequency: (data as any).notification_frequency ?? "instant",
      latitude: (data as any).latitude ?? null,
      longitude: (data as any).longitude ?? null,
      categories: (data.categories ?? []) as string[],
      quietStart: data.quiet_start,
      quietEnd: data.quiet_end,
      soundVibration: data.sound_vibration,
      newDeals: data.new_deals,
      favoriteBusinesses: data.favorite_businesses,
      expiringDeals: data.expiring_deals,
      specialOffers: data.special_offers,
      announcements: data.announcements,
      nearbyDeals: data.nearby_deals,
    };
  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PrefsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      user_id: userId,
      enabled: data.enabled,
      radius_m: data.radiusM,
      // keep legacy radius_km in sync so older code doesn't break
      radius_km: data.radiusM ? Math.round(data.radiusM / 1000) : 0,
      notification_frequency: data.frequency,
      latitude: data.latitude,
      longitude: data.longitude,
      categories: data.categories,
      quiet_start: data.quietStart,
      quiet_end: data.quietEnd,
      sound_vibration: data.soundVibration,
      new_deals: data.newDeals,
      favorite_businesses: data.favoriteBusinesses,
      expiring_deals: data.expiringDeals,
      special_offers: data.specialOffers,
      announcements: data.announcements,
      nearby_deals: data.nearbyDeals,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
