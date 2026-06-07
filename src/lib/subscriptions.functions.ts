import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlatformSchema = z.enum(["web", "ios", "android"]);

const SaveSchema = z.object({
  onesignalSubscriptionId: z.string().min(1).max(128),
  platform: PlatformSchema,
  deviceLabel: z.string().min(1).max(255).optional(),
});

/** Upsert the current device subscription for the signed-in user. */
export const saveOneSignalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          onesignal_subscription_id: data.onesignalSubscriptionId,
          platform: data.platform,
          device_label: data.deviceLabel ?? null,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "onesignal_subscription_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RemoveSchema = z.object({
  onesignalSubscriptionId: z.string().min(1).max(128),
});

/** Mark a device subscription inactive (called on sign-out). */
export const deactivateOneSignalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("onesignal_subscription_id", data.onesignalSubscriptionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
