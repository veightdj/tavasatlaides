# TavasAtlaides — Navigation & Profile Refactor

## 1. Bottom navigation (5 tabs, fixed)

Update `src/components/MobileBottomNav.tsx`:

```
Home (/) — Near Me (/nearby) — Map (/map) — Saved (/favorites) — Profile (/profile)
```

- Replace the current Settings tab with Profile.
- Same tab set for client AND partner (no role split in the bar itself).
- Keep visible on all non-marketing, non-admin, non-auth routes (including the new partner pages under `/profile/*`).
- Remove the separate merchant mobile nav inside `src/routes/_authenticated.tsx` (the 4-tab Dashboard/Ads/New/Store strip) — partner navigation moves into Profile.

## 2. Mobile header cleanup

In `src/components/layout/Header.tsx`, remove the mobile hamburger / logo-side menu. Desktop header stays unchanged.

## 3. Delete settings surfaces

- Delete `src/routes/settings.notifications.tsx`.
- Delete `src/routes/_authenticated/settings.tsx`.
- Remove any link pointing to `/settings*` (header, footer, prompts, deep links). Anything that previously linked there now links to `/profile` (or a Profile section anchor).

## 4. New `/profile` hub

New file: `src/routes/_authenticated/profile.tsx` — the single control center. Detects role via existing `user_roles` table (`has_role(user, 'partner')` / `'admin'`), defaults to CLIENT.

Layout: mobile-first, grouped accordion cards, lazy-rendered sections (each section is its own component in `src/components/profile/`):

### CLIENT sections
- **Account** — `AccountCard` (avatar, name, email; reuse `profiles` table fields).
- **Activity** — `FavoritesLink`, `SavedDealsLink`, `NotificationCenterLink` (link to `/favorites` and a new `/profile/notifications` inbox stub; the inbox is wired to `notification_history` table read-only).
- **Preferences** — `NotificationPrefsSection` (moves the whole body of the old `settings.notifications.tsx` here, unchanged logic), `GpsPrefsSection` (radius + location permission toggle, persists to `notification_preferences.latitude/longitude/radius_km`), `LanguageSection` (existing `useI18n`), `ThemeSection` (light/dark/system via `next-themes` if present, else CSS class on `<html>`).
- **Support** — links to `/faq`, `/contact`, `/terms`, `/privacy`, `/cookie-policy`.
- **Account actions** — Deactivate (existing `deactivateAccount` serverFn), Logout (`supabase.auth.signOut` + cache teardown).

### PARTNER sections (rendered when `has_role('partner')`)
All client sections remain available below partner tools — partners are still users. Above them:
- **Business Overview** — company info card pulled from `stores` (owner_id = user).
- **Business Tools** — links to `/profile/dashboard`, `/profile/ads`, `/profile/ads/new`, `/profile/store`.
- **Performance** — `/profile/analytics/saves`, `/profile/analytics/clicks` (new thin pages that read from `ad_saves` / `ad_clicks` aggregated by owner).
- **Operations** — `/profile/store` (branch management lives in store editor), `/profile/notifications-management` (placeholder section that lists the partner's outgoing notifications from `notification_logs`).
- **Revenue** — `/profile/billing` (stub page: "Subscription & Billing coming soon").

## 5. Move partner routes under `/profile/*`

Rename files (file moves only; component bodies unchanged except for internal `<Link to>` and `createFileRoute` paths):

```
_authenticated/dashboard.tsx       -> _authenticated/profile.dashboard.tsx
_authenticated/ads.index.tsx       -> _authenticated/profile.ads.index.tsx
_authenticated/ads.new.tsx         -> _authenticated/profile.ads.new.tsx
_authenticated/ads.$id.tsx         -> _authenticated/profile.ads.$id.tsx
_authenticated/store.tsx           -> _authenticated/profile.store.tsx
```

New thin partner pages:
- `_authenticated/profile.analytics.saves.tsx`
- `_authenticated/profile.analytics.clicks.tsx`
- `_authenticated/profile.notifications-management.tsx`
- `_authenticated/profile.billing.tsx`
- `_authenticated/profile.notifications.tsx` (notification inbox)

Update every internal `<Link to="/dashboard">`, `/ads`, `/ads/new`, `/ads/$id`, `/store` reference across `src/` to the new `/profile/...` URLs. The old URLs are gone — no redirects (per "full rewrite" decision).

## 6. Unified Notification System

- Single source of truth: `notification_preferences` (already exists, schema kept).
- Notification Center component reads `notification_history` filtered by `user_id`.
- Partner outgoing notifications: read `notification_logs` joined to ads owned by the partner.
- No new tables. No new server functions beyond a `listNotificationInbox` serverFn.

## 7. Future-proofing (structure only, no UI)

Add empty placeholder folders/files so future features have a clear home, but no working features:
- `src/lib/features/cashback.ts` — `export const CASHBACK_ENABLED = false;`
- `src/lib/features/qr-coupons.ts`
- `src/lib/features/loyalty.ts`
- `src/lib/features/reviews.ts`
- `src/lib/features/referrals.ts`
- `src/lib/features/partner-promotions.ts`

A single `src/lib/features/index.ts` re-exports flags. Profile sections check the flag and render nothing today.

## 8. Out of scope (explicit)

- No deep redesign of Dashboard, Ad editor, Store editor internals — only their URL and the link entries in Profile change.
- No new database tables or migrations.
- No native wrapper (Capacitor) code — structure is compatible but not built.
- Admin routes (`/admin/*`) untouched.
- Marketing site (`www.tavasatlaides.lv`) untouched.

## 9. Files touched (summary)

- **Edit**: `MobileBottomNav.tsx`, `Header.tsx`, `_authenticated.tsx`, `AppNativePrompts.tsx`, dictionaries (Profile labels), any link references to old paths.
- **Create**: `_authenticated/profile.tsx` + 5 partner sub-routes + `src/components/profile/*` section components + `src/lib/features/*`.
- **Move**: 5 partner route files under `profile.*`.
- **Delete**: `settings.notifications.tsx`, `_authenticated/settings.tsx`.

After approval I implement straight through in one pass and verify the build.
