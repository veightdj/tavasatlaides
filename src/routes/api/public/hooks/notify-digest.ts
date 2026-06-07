import { createFileRoute } from "@tanstack/react-router";

// Daily summary dispatcher. Called by pg_cron at fixed UTC hours.
// Query param `slot` is one of 1|2|3 — controls which frequencies are flushed:
//   slot=1 -> daily_1 (and also daily_2, daily_3 if their hour matches)
// Simpler: pass slot as the frequency level; we look up users whose frequency
// is <= slot count and flush their queue.
//
// Schedule (UTC):
//   10:00 -> ?slot=1    (sends to daily_1, daily_2, daily_3)
//   14:00 -> ?slot=2    (sends to daily_2, daily_3)
//   18:00 -> ?slot=3    (sends to daily_3)
//
// 1x/day = one summary at 10:00. 2x/day = 10:00 + 14:00. 3x/day = 10:00 + 14:00 + 18:00.

export const Route = createFileRoute("/api/public/hooks/notify-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const apiKey = request.headers.get("apikey") ?? "";
        const expected = process.env.DEAL_DISPATCH_APIKEY ?? "";
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const slot = Number(url.searchParams.get("slot") ?? "1");
        if (![1, 2, 3].includes(slot)) {
          return new Response("Bad slot", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendOneSignal } = await import("@/lib/onesignal-send.server");

        // Frequencies eligible at this slot
        const eligible =
          slot === 1
            ? ["daily_1", "daily_2", "daily_3"]
            : slot === 2
              ? ["daily_2", "daily_3"]
              : ["daily_3"];

        // Aggregate pending counts per user
        const { data: pending, error: pErr } = await supabaseAdmin
          .from("pending_deal_notifications")
          .select("user_id, ad_id");
        if (pErr) {
          console.error("[digest] pending error", pErr);
          return new Response("Server error", { status: 500 });
        }
        if (!pending || pending.length === 0) {
          return Response.json({ ok: true, sent: 0 });
        }

        const byUser = new Map<string, string[]>();
        for (const row of pending) {
          if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
          byUser.get(row.user_id)!.push(row.ad_id);
        }

        const userIds = Array.from(byUser.keys());
        // Filter to enabled users with eligible frequency
        const { data: prefs } = await supabaseAdmin
          .from("notification_preferences")
          .select("user_id,enabled,notification_frequency")
          .in("user_id", userIds);

        const flushUsers = (prefs ?? [])
          .filter((p) => p.enabled && eligible.includes(p.notification_frequency))
          .map((p) => p.user_id);

        let sent = 0;
        const flushedAdIds: string[] = [];
        for (const uid of flushUsers) {
          const ads = byUser.get(uid) ?? [];
          if (!ads.length) continue;
          const n = ads.length;
          const title = n === 1 ? "1 new deal near you" : `${n} new deals near you`;
          const message =
            n === 1
              ? "Open the app to see today's deal."
              : `Tap to browse ${n} fresh deals in your area.`;
          try {
            await sendOneSignal({
              title,
              message,
              url: "https://tavasatlaides.lovable.app/deals",
              externalUserIds: [uid],
              data: { kind: "daily_summary", count: n, ad_ids: ads },
            });
            sent++;
            flushedAdIds.push(...ads.map((a) => `${uid}|${a}`));
          } catch (e) {
            console.error("[digest] send failed", uid, e);
          }
        }

        // Delete flushed rows
        if (flushUsers.length) {
          const { error: dErr } = await supabaseAdmin
            .from("pending_deal_notifications")
            .delete()
            .in("user_id", flushUsers);
          if (dErr) console.error("[digest] delete error", dErr);
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
