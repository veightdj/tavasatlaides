
# OneSignal Integration — Phased Plan

All phases build on existing OneSignal setup (`src/lib/onesignal.ts`, `src/lib/onesignal.functions.ts`, `public/OneSignalSDKWorker.js`). Each phase is independently shippable.

## Phase 1 — Foundation (env, multi-device, prefs schema)

**Schema (migration):**
- `user_subscriptions` — `user_id`, `onesignal_subscription_id` (unique), `platform` (web/ios/android), `device_label`, `last_seen_at`, `is_active`. RLS: user manages own; admin reads all.
- Extend `notification_preferences`: add `new_deals`, `favorite_businesses`, `expiring_deals`, `special_offers`, `announcements`, `nearby_deals` boolean columns (default true). Replace radius enum to allow 5/10/25/50.
- `notification_history` — `id`, `sent_by`, `title`, `body`, `target_type` (all/city/category/business/radius/segment), `target_payload jsonb`, `onesignal_notification_id`, `status`, `scheduled_for`, `sent_at`, `recipients`, `is_draft`. RLS: admin only.
- `notification_events` — `id`, `onesignal_notification_id`, `subscription_id`, `event` (delivered/clicked/dismissed), `data jsonb`, `occurred_at`. RLS: admin read; service-role write.

**Code:**
- `.env`: add `VITE_ONESIGNAL_APP_ID=60ddea51-…`. Update `src/lib/onesignal.ts` to read `import.meta.env.VITE_ONESIGNAL_APP_ID` (fallback to current constant during transition).
- `saveOneSignalSubscription` server fn: upserts `user_subscriptions` row keyed by `(user_id, onesignal_subscription_id)`; called after `registerOneSignal()` succeeds.
- `removeOneSignalSubscription` server fn: marks current device inactive; called from sign-out hook.
- Root layout: on `SIGNED_IN` call `setOneSignalExternalId(user.id)` + save subscription; on `SIGNED_OUT` call `OneSignal.logout()` + mark inactive.
- Rewrite `src/routes/settings.notifications.tsx`: persists prefs to `notification_preferences` (currently only localStorage) with category toggles for the 7 categories + radius selector (5/10/25/50).
- Delete dead web-push helpers (`src/lib/push.ts`, `public/notif-sw.js`) now that OneSignal owns push.

## Phase 2 — Location radius + automation

**Server route** `src/routes/api/public/hooks/deal-published.ts` — invoked from a Postgres trigger on `ads INSERT` and on status transitions. Verifies shared HMAC, then:
- Loads ad + store coords.
- Queries opted-in users by category + radius (Haversine on `profiles.last_lat/lng`) + favorite-business filter.
- Calls OneSignal REST with `include_aliases.external_id` chunks of 2000.
- Logs to `notification_history`.

**pg_cron jobs (insert tool):**
- Every 15 min → `expiring-soon` route (24h + 3h windows, dedup via `notification_history` unique key).

## Phase 3 — Admin send panel

`src/routes/admin.notifications.tsx`:
- Compose form (title, body, URL, schedule).
- Targeting tabs: all / city / category / business / radius-around-point / saved segment.
- Drafts list, history table with delivered/opened/clicked from `notification_events`.
- Server fn `sendAdminNotification` extends existing `sendOneSignalNotification` with the segment resolvers and writes to `notification_history`.

## Phase 4 — OneSignal webhook → analytics

`src/routes/api/public/hooks/onesignal.ts`:
- Verifies signature (configure shared secret in OneSignal dashboard).
- Maps event payload → `notification_events` insert via `supabaseAdmin`.
- Updates `notification_history` aggregate counts.

## Phase 5 — Debug page + final polish

`src/routes/admin.notifications.debug.tsx`:
- Shows OneSignal init status, subscription id, opted-in flag, external id, geolocation status, last received notification (subscribed via `OneSignal.Notifications.addEventListener('foregroundWillDisplay')`).
- "Send test to me" button.
- Capacitor sync note for Android.

Rate limiting and dedup: unique partial index on `notification_history (target_hash, dedup_key)` to prevent duplicate auto-sends; admin sends throttled via simple per-admin counter in `notification_history`.

## Technical notes

- App ID: `VITE_ONESIGNAL_APP_ID` (client), REST key already in `ONESIGNAL_REST_API_KEY` secret.
- Webhook signature: add `ONESIGNAL_WEBHOOK_SECRET` via secrets tool in Phase 4.
- Android: requires `npx cap sync android` + `onesignal-cordova-plugin` registration + `google-services.json` (FCM) — out of sandbox; documented in Phase 5.
- Public schema GRANTs included with every CREATE TABLE.
- All admin server fns gate on `has_role(auth.uid(),'admin')`.

## Execution

Confirm and I'll start with **Phase 1** in this turn (migration + foundation code). Each subsequent phase ships in its own turn so you can review and test before moving on.
