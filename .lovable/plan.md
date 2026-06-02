# Database performance optimization

## Why not "full normalize"?
A true restructure (lookup table for `category`, splitting `hours_json`, moving `cover_image_url` into `ad_images`) would force rewrites in 20+ components for a few KB of storage savings. Not worth it. The real performance wins are below.

## What I'll do

### 1. Indexes (biggest win, zero risk)
Single migration adding indexes that match every hot query path:

- `ads (status, ends_at)` — public listing filter + auto-expire job
- `ads (status, created_at desc)` — "newest" sort on /deals
- `ads (status, discount_pct desc)` — "discount" sort
- `ads (store_id)` — store→ads joins
- `ads (category, status)` — category pages
- `ad_images (ad_id, sort_order)`
- `ad_views (ad_id, viewed_at)`, `ad_clicks (ad_id, created_at)`, `ad_saves (ad_id)`, `ad_shares (ad_id)`
- `ad_status_logs (ad_id, created_at desc)`
- `stores (slug)` UNIQUE, `stores (city, category)`, `stores (lat, lng)` for nearby
- `banners (is_active, starts_at, ends_at, sort_order)`
- `notification_logs (user_id, sent_at desc)`, `notification_logs (ad_id)`

### 2. Missing foreign keys
Add FK constraints (CASCADE on delete) for: `ad_clicks.ad_id`, `ad_saves.ad_id`, `ad_shares.ad_id`, `ad_status_logs.ad_id`, `ad_views` already has one, `store_shares.store_id`, `notification_logs.ad_id`, `notification_logs.user_id`. This prevents orphan rows and lets Postgres optimize joins.

### 3. Scheduled jobs (pg_cron)
- **Hourly:** call `expire_outdated_ads()` — the function exists but isn't scheduled, so deals never auto-expire today.
- **Daily at 03:00 UTC:** delete `ad_views`, `ad_clicks`, `ad_shares`, `notification_logs` older than 90 days. Aggregated counts on the deal cards keep working because they're computed live and small.

### 4. Pagination (frontend)
Switch from `.limit(120)` / fetching-all to range-based pagination:

- **Admin `/_authenticated/ads`** — 25 per page, prev/next buttons, URL search params for `?page=`.
- **Public `/deals`** — "Load more" infinite scroll, 24 per page, server-side filtering moved into the query (so search/category/city run in SQL, not on the full client list).
- **Public `/stores`** — 24 per page, same pattern.

Uses `range(from, to)` + `count: 'exact'` on the count query.

### 5. Storage cleanup
- Add a partial index `ads (ends_at) WHERE status = 'active'` so the hourly expire scan is O(log n).
- The text fields (`cover_image_url`, `description`) stay — they're small and moving them adds joins.

## What I'm explicitly NOT doing
- Not splitting `hours_json` into a `store_hours` table — JSONB is fast, and the editor reads/writes it as a unit.
- Not creating a `categories` table — slug-based text is already efficient and changing it touches CategoryCircles, every list page, and i18n keys.
- Not moving `cover_image_url` into `ad_images` — saves no real storage and breaks every card render.

## Order of execution
1. Migration: indexes + FKs (you approve)
2. Migration: pg_cron schedules (you approve)
3. Code edits: pagination on the three lists
4. Verify build, then publish

Ready to start with step 1?
