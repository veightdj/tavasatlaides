import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORY_SLUGS } from "@/lib/categories";

const CategorySchema = z.enum(CATEGORY_SLUGS as unknown as [string, ...string[]]);

const PrefsSchema = z.object({
  enabled: z.boolean(),
  radiusKm: z.number().int().refine((v) => [1, 3, 5, 10, 25, 50].includes(v), {
    message: "Invalid radius",
  }),
  categories: z.array(CategorySchema).min(0).max(32),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  quietStart: z.number().int().min(0).max(23),
  quietEnd: z.number().int().min(0).max(23),
  maxPerDay: z.number().int().min(1).max(50),
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
      radiusKm: data.radius_km,
      categories: (data.categories ?? []) as string[],
      latitude: data.latitude,
      longitude: data.longitude,
      quietStart: data.quiet_start,
      quietEnd: data.quiet_end,
      maxPerDay: data.max_per_day,
      soundVibration: data.sound_vibration,
      newDeals: data.new_deals,
      favoriteBusinesses: data.favorite_businesses,
      expiringDeals: data.expiring_deals,
      specialOffers: data.special_offers,
      announcements: data.announcements,
      nearbyDeals: data.nearby_deals,
    };
  });

export const getNewDealAlertEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prefs, error: prefError } = await supabase
      .from("notification_preferences")
      .select("enabled,new_deals,notification_frequency,categories,latitude,longitude")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefError) throw new Error(prefError.message);

    const { count, error: subError } = await supabase
      .from("user_subscriptions")
      .select("onesignal_subscription_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);
    if (subError) throw new Error(subError.message);

    const hasLocation = prefs?.latitude != null && prefs?.longitude != null;
    const hasCategories = Array.isArray(prefs?.categories) && prefs.categories.length > 0;
    const hasPushSubscription = (count ?? 0) > 0;
    return {
      eligible:
        Boolean(prefs?.enabled) &&
        Boolean(prefs?.new_deals) &&
        prefs?.notification_frequency === "instant" &&
        hasCategories &&
        hasLocation &&
        hasPushSubscription,
      hasPreferences: Boolean(prefs),
      hasLocation,
      hasCategories,
      hasPushSubscription,
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
      radius_km: data.radiusKm,
      categories: data.categories,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      quiet_start: data.quietStart,
      quiet_end: data.quietEnd,
      max_per_day: data.maxPerDay,
      sound_vibration: data.soundVibration,
      notification_frequency: "instant",
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
