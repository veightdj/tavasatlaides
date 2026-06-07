import { createFileRoute } from "@tanstack/react-router";

// Called by the ads INSERT trigger via pg_net.
// For each notification_preferences row within radius, either:
//   - Sends an instant OneSignal push (notification_frequency='instant'), or
//   - Inserts a pending_deal_notifications row to be flushed by the daily cron.
export const Route = createFileRoute("/api/public/hooks/notify-deal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { ad_id?: string } = {};
        try { body = await request.json(); } catch { /* noop */ }
        const adId = body.ad_id;
        if (!adId || typeof adId !== "string") {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Load the ad + its store coords
        const { data: ad, error: adErr } = await supabaseAdmin
          .from("ads")
          .select("id,title,description,category,store_id,status,is_hidden,deleted_at,stores:store_id(name,lat,lng)")
          .eq("id", adId)
          .maybeSingle();
        if (adErr || !ad) {
          return Response.json({ ok: false, reason: "ad_not_found" }, { status: 404 });
        }
        if (ad.status !== "active" || ad.is_hidden || ad.deleted_at) {
          return Response.json({ ok: true, skipped: "not_publishable" });
        }
        const store = (ad as any).stores as { name: string; lat: number | null; lng: number | null } | null;
        if (!store?.lat || !store?.lng) {
          return Response.json({ ok: true, skipped: "no_store_coords" });
        }

        // Pull all enabled preferences with a location set
        const { data: prefs, error: prefsErr } = await supabaseAdmin
          .from("notification_preferences")
          .select("user_id,enabled,new_deals,nearby_deals,categories,radius_m,latitude,longitude,notification_frequency,quiet_start,quiet_end")
          .eq("enabled", true);
        if (prefsErr) {
          console.error("[notify-deal] prefs error", prefsErr);
          return new Response("Server error", { status: 500 });
        }

        const instantUsers: string[] = [];
        const queueRows: Array<{ user_id: string; ad_id: string; distance_m: number | null }> = [];

        for (const p of prefs ?? []) {
          if (!p.new_deals && !p.nearby_deals) continue;
          if (p.categories && p.categories.length && !p.categories.includes(ad.category)) continue;
          if (p.latitude == null || p.longitude == null) continue;

          // Haversine in JS (avoids extra DB round-trips)
          const distM = haversineMeters(p.latitude, p.longitude, store.lat, store.lng);
          if (p.radius_m != null && distM > p.radius_m) continue;

          if (p.notification_frequency === "instant") {
            instantUsers.push(p.user_id);
          } else {
            queueRows.push({ user_id: p.user_id, ad_id: adId, distance_m: Math.round(distM) });
          }
        }

        // Queue inserts (ignore duplicates)
        if (queueRows.length) {
          const { error: qErr } = await supabaseAdmin
            .from("pending_deal_notifications")
            .upsert(queueRows, { onConflict: "user_id,ad_id", ignoreDuplicates: true });
          if (qErr) console.error("[notify-deal] queue error", qErr);
        }

        // Instant push
        if (instantUsers.length) {
          try {
            const { sendOneSignal } = await import("@/lib/onesignal-send.server");
            await sendOneSignal({
              title: `New deal: ${ad.title}`,
              message: store.name ? `${store.name} – tap to see the offer` : "Tap to see the offer",
              url: `https://tavasatlaides.lovable.app/deals/${ad.id}`,
              externalUserIds: instantUsers,
              data: { ad_id: ad.id, kind: "new_deal" },
            });
          } catch (e) {
            console.error("[notify-deal] OneSignal send failed", e);
          }
        }

        return Response.json({
          ok: true,
          instant: instantUsers.length,
          queued: queueRows.length,
        });
      },
    },
  },
});

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
