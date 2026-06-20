## Phase 1 — Admin Businesses page

A focused first slice. Email activation flow + audit log UI come in Phase 2.

### Database (one migration)

Extend `stores` and add audit log:

- Add columns to `public.stores`:
  - `contact_email text`
  - `subscription_plan` enum `subscription_plan` = ('bronze','silver','gold') — default `'bronze'`
  - `partner_status` enum `partner_status` = ('pending_activation','active','managed_by_admin','suspended','expired') — default `'pending_activation'`
- New table `public.admin_audit_logs` (admin_id, action, target_user_id, target_store_id, payload jsonb, created_at). Admin-read-only RLS.

### Server functions (`src/lib/admin-businesses.functions.ts`)

All `.middleware([requireSupabaseAuth])` + admin check via `has_role`, then load `supabaseAdmin` inside handler.

- `createBusinessWithPartner({ name, contact_email, phone, category, city, address, website, description, logo_url, subscription_plan })`
  - Generates slug, creates auth user with `supabaseAdmin.auth.admin.createUser` (random password, `email_confirm: true`), inserts `user_roles` row with `partner`, inserts `stores` row with `owner_id = new user id`, `partner_status = 'pending_activation'`.
  - Returns `{ store_id, partner_user_id }`. Email send is stubbed (`activation_pending`) for Phase 2.
- `updateBusiness({ id, patch })` — admin updates store fields.
- `setBusinessPlan({ id, plan })`, `setBusinessStatus({ id, status })`.
- `sendActivationEmail({ id })` — Phase 2 stub: calls `supabaseAdmin.auth.admin.generateLink({ type: 'recovery' })` and logs the link. Real branded email arrives in Phase 2.
- `resetPartnerPassword({ id })` — same `generateLink('recovery')`.
- `deleteBusinessAccount({ id })` — deletes store + auth user.
- `startImpersonation({ store_id })` — writes audit log, returns `{ store_id, owner_id }`.

### Admin UI — `/admin/businesses`

`AdminShell` page mirroring `admin.companies.tsx` layout. Adds:

- Search by name/email.
- Filters: status, plan, city, category (loaded from existing distinct values).
- Pagination (20/page).
- "New business" button → dialog with all fields.
- Row columns: Logo, Name, Email, Phone, Plan, Status, Created, Actions menu.
- Actions menu per row: Edit, Login as Partner, Send activation email, Reset password, Suspend / Reactivate, Change plan, Delete.

Add "Businesses" entry to `AdminShell` nav.

### Impersonation (session-based, minimal)

- "Login as Partner" sets `sessionStorage.setItem('admin_impersonation', JSON.stringify({ store_id, owner_id, started_at }))`, calls `startImpersonation` (audit log), and navigates to `/profile`.
- Add a top-of-page yellow banner component `<ImpersonationBanner />` mounted in `__root.tsx` that shows when the flag is set, with "Exit impersonation" button (clears flag, reloads).
- Profile/partner pages are not rewired in Phase 1. The banner makes impersonation visible; deeper "view-as" rewiring of partner queries comes when Profile is refactored. (Calling this out so it's not a surprise.)

### Deferred to Phase 2

- Branded Lovable activation email (requires email domain setup).
- Full "act as partner" data scoping in Profile.
- Admin audit log viewer UI.

### Token-efficiency notes

- Single combined query with `count: 'exact'` per page load.
- Distinct cities/categories loaded once via cached query (5min stale).
- Mutations invalidate only the `admin-businesses` query key.
