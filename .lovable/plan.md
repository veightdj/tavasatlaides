# Plan: trust + ads + analytics + app settings

Four independent slices. I'll ship them in this order; each is usable on its own.

## 1. App settings (anonymous, device-based) — `app.tavasatlaides.lv/settings`
Smallest slice, unblocks push targeting.
- New route `src/routes/settings.index.tsx` (the app's settings hub; the existing `settings/notifications` stays as deep link).
- Device-local prefs in `localStorage` (`tavasatlaides.prefs`):
  - radius (km, slider 1–50)
  - selected category slugs (multi)
  - push ON/OFF (wires existing `PushNotificationToggle`)
  - manual fallback city (used when GPS denied)
- Tiny `usePrefs()` hook (read/write/subscribe).
- Feed + Near Me + Map read prefs to filter; existing GPS fallback uses `prefs.fallbackCity`.

## 2. Banner ads system — admin CRUD + public render
- `banners` table already exists (12 cols, 5 policies). I'll add a small server fn surface:
  - `listActiveBanners({ placement })` — public, via `supabaseAdmin`, filters by date window + `is_active`.
  - `recordBannerImpression / recordBannerClick` — public anon insert into existing `ad_*` tables or a `banner_events` table (will check schema first).
- Admin page `src/routes/admin.banners.tsx` already exists — wire it to upload (storage bucket `banners` exists), set placement (`home_top`, `home_inline`, `app_feed`), schedule window, link URL.
- Render component `<BannerSlot placement="..."/>`:
  - mounted in marketing Home (`/`) and in app feed.

## 3. Partner analytics — `partners.tavasatlaides.lv/dashboard`
- Server fn `getPartnerAnalytics({ range })`:
  - aggregates `ad_views`, `ad_clicks`, `ad_shares`, `ad_saves` for ads owned by the caller (RLS via `requireSupabaseAuth`).
  - returns totals + 14-day daily series + per-deal breakdown.
- Dashboard cards: total views/clicks/CTR/saves + sparkline + top deals table.
- Uses `recharts` (already in shadcn chart).

## 4. Anti-fraud + trust score
Schema migration:
- `partner_trust_scores` (user_id PK, score int 0–100, level enum bronze/silver/gold, factors jsonb, updated_at).
- `deal_reports` (id, ad_id, reporter_fingerprint, reason enum, note, created_at, status).
- `fraud_signals` (id, ad_id, signal text, severity, payload jsonb, created_at).
Server fns:
- `submitDealReport` (anonymous, fingerprint-rate-limited in handler via existing tables; ack the no-backend-rate-limit caveat — best-effort soft limit by IP+fingerprint dedupe).
- `recalculateTrustScore(userId)` — runs on deal create, on report resolved, on admin verify/block. Factors: account age, # active deals, verified business, reports/active ratio, geo-validity rate, duplicate rate.
- `detectDealFraud(adId)` — runs on insert (deferred): duplicate title+geo within 7d, geo outside Baltics bounding box, suspiciously short title, excessive special chars.
Admin UI additions on `admin.deals.tsx` / `admin.companies.tsx`:
- Trust score badge + factors drawer.
- Reports queue with resolve/dismiss; resolve → trust recalc.
- Fraud signals column with severity dot.
Anonymous "Report deal" button on deal detail page.

## Technical notes
- All public reads go through `createServerFn` + `supabaseAdmin` (server only). No new broad `TO anon` policies.
- Trust recalculation lives in a server fn called from admin actions and from `notify_new_deal`-style triggers (I'll add one trigger after the fn exists).
- No new edge functions. No rate-limit infra (project lacks a primitive — soft dedupe only; flagged to user).
- App settings are device-local; nothing hits backend except push token (already wired via OneSignal).

## Out of scope (call out if you want them)
- Hard rate limiting (needs infra).
- ML-based fraud — only rule-based signals.
- Email notifications for reports/verification.

I'll do them in order 1 → 2 → 3 → 4 and check in after each, so you can redirect early.
