import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const saveUserLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LocationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        last_lat: data.lat,
        last_lng: data.lng,
        last_location_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PushTokenSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["ios", "android", "web"]),
});

export const savePushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PushTokenSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ push_token: data.token, push_platform: data.platform })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
