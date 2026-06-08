import { createFileRoute } from "@tanstack/react-router";

const ONESIGNAL_APP_ID = "60ddea51-e254-4626-bfb2-888c3ec55efe";
const ONESIGNAL_API = "https://api.onesignal.com/notifications";
const SITE_BASE_URL = "https://tavasatlaides.lv";

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

function rigaHour(): number {
  const s = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Riga",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(s, 10);
}

function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // wraps midnight
}

export const Route = createFileRoute("/api/public/hooks/notify-deal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { ad_id?: string };
        try {
          body = (await request.json()) as { ad_id?: string };
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const adId = body.ad_id;
        if (!adId || typeof adId !== "string") {
          return new Response("Missing ad_id", { status: 400 });
        }

        const onesignalKey = process.env.ONESIGNAL_REST_API_KEY;
        if (!onesignalKey) {
          return new Response("OneSignal not configured", { status: 500 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Load ad + store
        const { data: ad, error: adErr } = await supabaseAdmin
          .from("ads")
          .select(
            "id,title,category,status,is_hidden,deleted_at,store_id,cover_image_url",
          )
          .eq("id", adId)
          .maybeSingle();
        if (adErr || !ad) {
          return new Response("Ad not found", { status: 404 });
        }
        if (ad.status !== "active" || ad.is_hidden || ad.deleted_at) {
          return Response.json({ ok: true, skipped: "not_active" });
        }

        const { data: store } = await supabaseAdmin
          .from("stores")
          .select("id,name,lat,lng,is_hidden,is_blocked,deleted_at")
          .eq("id", ad.store_id)
          .maybeSingle();
        if (
          !store ||
          store.is_hidden ||
          store.is_blocked ||
          store.deleted_at ||
          store.lat == null ||
          store.lng == null
        ) {
          return Response.json({ ok: true, skipped: "store_unavailable" });
        }

        // Candidate users: instant new_deals subscribers in this category with location
        const { data: prefs, error: prefErr } = await supabaseAdmin
          .from("notification_preferences")
          .select(
            "user_id,radius_km,latitude,longitude,quiet_start,quiet_end,max_per_day",
          )
          .eq("enabled", true)
          .eq("new_deals", true)
          .eq("notification_frequency", "instant")
          .contains("categories", [ad.category])
          .not("latitude", "is", null)
          .not("longitude", "is", null);
        if (prefErr) {
          return new Response(prefErr.message, { status: 500 });
        }

        const hour = rigaHour();
        const sinceMidnight = new Date();
        sinceMidnight.setUTCHours(0, 0, 0, 0);

        // Skip users who already got this ad
        const { data: existing } = await supabaseAdmin
          .from("pending_deal_notifications")
          .select("user_id")
          .eq("ad_id", adId);
        const already = new Set((existing ?? []).map((r) => r.user_id));

        type Match = { user_id: string; distance_m: number };
        const matches: Match[] = [];

        for (const p of prefs ?? []) {
          if (already.has(p.user_id)) continue;
          if (inQuietHours(hour, p.quiet_start, p.quiet_end)) continue;
          const dist = haversineMeters(
            p.latitude as number,
            p.longitude as number,
            store.lat as number,
            store.lng as number,
          );
          if (dist > p.radius_km * 1000) continue;

          // Daily cap
          const { count } = await supabaseAdmin
            .from("notification_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", p.user_id)
            .gte("sent_at", sinceMidnight.toISOString());
          if ((count ?? 0) >= p.max_per_day) continue;

          matches.push({ user_id: p.user_id, distance_m: Math.round(dist) });
        }

        if (matches.length === 0) {
          return Response.json({ ok: true, recipients: 0 });
        }

        // Send via OneSignal in batches of 2000
        const title = store.name;
        const message = ad.title;
        const url = `${SITE_BASE_URL}/deals/${ad.id}`;
        let oneSignalId: string | null = null;
        let totalRecipients = 0;
        let lastError: string | null = null;

        for (let i = 0; i < matches.length; i += 2000) {
          const batch = matches.slice(i, i + 2000);
          const payload: Record<string, unknown> = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title },
            contents: { en: message },
            url,
            target_channel: "push",
            include_aliases: { external_id: batch.map((m) => m.user_id) },
          };
          if (ad.cover_image_url) {
            payload.big_picture = ad.cover_image_url;
            payload.chrome_web_image = ad.cover_image_url;
          }
          const res = await fetch(ONESIGNAL_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Key ${onesignalKey}`,
            },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => ({}))) as {
            id?: string;
            recipients?: number;
            errors?: unknown;
          };
          if (!res.ok) {
            lastError = `OneSignal ${res.status}: ${JSON.stringify(data)}`;
            continue;
          }
          oneSignalId = oneSignalId ?? data.id ?? null;
          totalRecipients += data.recipients ?? batch.length;
        }

        // Persist per-user log + pending dedup
        const pendingRows = matches.map((m) => ({
          user_id: m.user_id,
          ad_id: adId,
          distance_m: m.distance_m,
        }));
        await supabaseAdmin
          .from("pending_deal_notifications")
          .upsert(pendingRows, { onConflict: "user_id,ad_id" });
        await supabaseAdmin.from("notification_logs").insert(pendingRows);

        // Aggregate history row (dedup per ad)
        await supabaseAdmin
          .from("notification_history")
          .upsert(
            {
              title,
              body: message,
              url,
              target_type: "auto",
              target_payload: { ad_id: adId, store_id: store.id },
              onesignal_notification_id: oneSignalId,
              status: lastError ? "failed" : "sent",
              recipients: totalRecipients,
              sent_at: new Date().toISOString(),
              dedup_key: `new_deal:${adId}`,
              error: lastError,
            },
            { onConflict: "dedup_key" },
          );

        return Response.json({
          ok: !lastError,
          recipients: totalRecipients,
          onesignal_id: oneSignalId,
          error: lastError,
        });
      },
    },
  },
});
