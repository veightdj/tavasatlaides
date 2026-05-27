## Security findings to fix

Two related RLS warnings on `ad_views`, `ad_clicks`, `ad_saves`, `ad_shares`, plus one informational supply-chain advisory.

### 1. Bind engagement events to a user (ad_views/clicks/saves/shares)

**Schema migration:**
- Add nullable `user_id uuid` column to all four tables (nullable so anonymous visitors can still record views/clicks/shares; saves will require auth).
- Default `user_id` to `auth.uid()` on insert.
- Add indexes on `(ad_id)` and `(user_id)` for query performance.

**Tighten RLS policies:**
- INSERT policies: keep allowing inserts on active ads, but force `user_id = auth.uid()` when authenticated (via WITH CHECK), and allow NULL only for anonymous users.
- For `ad_saves`: require authenticated user (no anonymous saves) and unique `(ad_id, user_id)` to prevent duplicate-save inflation.
- SELECT policies: keep "store owner sees their ad metrics" as the only read path. Add an additional SELECT policy on `ad_saves` so users can see their own saves (needed for the favorites UI).

### 2. Realtime broadcast leakage

The realtime channel policy is correct, but row payloads on the four engagement tables are still gated only by table SELECT RLS. Fix by:
- Removing these four high-volume tables from the `supabase_realtime` publication (the dashboard/ads pages already use `postgres_changes` — we'll switch them to lightweight polling/invalidation on user action, since per-row broadcasts of competitor click data is the leak vector).
- Alternative kept open: keep them on the publication but rely on the now-tightened SELECT policies (store-owner-only), since Supabase Realtime evaluates RLS per subscriber on row changes. I'll go with this alternative since the SELECT policies after step 1 already restrict reads to the owning store — no client change needed.

### 3. Supply chain (informational)

`@cloudflare/vite-plugin` transitive `ws` advisory — build-tool only, no runtime exposure. Mark as acknowledged in security memory; upstream patch required.

## Code touch points

- New migration: alter four tables, drop+recreate INSERT/SELECT policies, add unique index on `ad_saves(ad_id, user_id)`.
- `src/lib/favorites.ts` / wherever saves are inserted: ensure authenticated before insert (saves now require auth).
- No change needed for `ad_views`/`ad_clicks`/`ad_shares` insert call sites — `user_id` defaults to `auth.uid()` or NULL for anonymous.
- Update security memory documenting the access model and the accepted `ws` advisory.
- Mark the three findings via `manage_security_finding` once migration is applied.

## Open question

Saves currently appear to work for anonymous users (the favorites list lives in localStorage). Do you want me to:
- **A)** Keep `ad_saves` insertable by anonymous users too (just bind to `auth.uid()` when present), or
- **B)** Require login to save a deal (cleaner, prevents click-fraud-style metric inflation)?

I'll proceed with **A** by default unless you say otherwise.