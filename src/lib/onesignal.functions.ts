import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ONESIGNAL_APP_ID = "60ddea51-e254-4626-bfb2-888c3ec55efe";
const ONESIGNAL_API = "https://api.onesignal.com/notifications";

const SendSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  url: z.string().url().max(2000).optional(),
  // Target by OneSignal external user ids (your app user ids)
  externalUserIds: z.array(z.string().min(1).max(128)).min(1).max(2000).optional(),
  // Or target by raw OneSignal subscription/player ids
  playerIds: z.array(z.string().min(1).max(128)).min(1).max(2000).optional(),
});

/**
 * Send a OneSignal notification. Requires the caller to be an authenticated
 * admin. Targets users by external id (recommended) or raw player id.
 */
export const sendOneSignalNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.externalUserIds && !data.playerIds) {
      throw new Error("Provide externalUserIds or playerIds");
    }

    // Admin-only gate
    const { supabase, userId } = context;
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roles) throw new Error("Forbidden");

    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY not configured");

    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: data.title },
      contents: { en: data.message },
    };
    if (data.url) payload.url = data.url;
    if (data.externalUserIds) payload.include_aliases = { external_id: data.externalUserIds };
    if (data.externalUserIds) payload.target_channel = "push";
    if (data.playerIds) payload.include_subscription_ids = data.playerIds;

    const res = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`OneSignal error ${res.status}: ${JSON.stringify(body)}`);
    }
    return { ok: true, id: body.id ?? null, recipients: body.recipients ?? null };
  });
