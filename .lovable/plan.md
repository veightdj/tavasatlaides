
# DealsLV — Local Store Ads & Discounts (Jurmala & Riga)

A marketplace where shoppers browse store discounts on a map and merchants self-publish ads. Launches with Jurmala and Riga, structured to add more Latvian cities later.

## User flows

**Shopper (no login required)**
- Land on home → featured deals + city switcher (Jurmala / Riga)
- Browse map with pins, or list view with filters (category, distance, discount %, expiring soon)
- Open a deal → see store info, photos, validity, address, map, "Save" button
- Save favorites (stored locally until they choose to register; optional shopper account later)
- Opt-in browser notifications for new deals from saved stores

**Merchant (login required)**
- Sign up / log in (email + password, Google)
- Onboarding: create store profile (name, category, address → geocoded, logo, hours, description)
- Dashboard: list of own ads with status (active / scheduled / expired)
- Create ad: title, description, discount %, original/sale price (optional), photos, start/end dates, category
- Edit, pause, delete, duplicate ads
- Basic stats per ad: views, favorites, map clicks

## Pages / routes

```
/                          home, featured deals + city picker
/deals                     all deals, filters + list/map toggle
/deals/$id                 deal detail
/map                       full-screen map view
/stores/$id                store profile + their deals
/categories/$slug          deals by category
/favorites                 saved deals (localStorage-backed)
/about                     about + how it works
/for-merchants             marketing page → CTA to sign up
/login                     merchant login
/signup                    merchant signup
/_authenticated/dashboard  merchant overview + stats
/_authenticated/store      edit store profile
/_authenticated/ads        list own ads
/_authenticated/ads/new    create ad
/_authenticated/ads/$id    edit ad
```

## i18n (EN / LV / RU)

- Language switcher in header, persists in localStorage
- UI strings via a lightweight i18n dictionary (`src/i18n/{en,lv,ru}.ts`)
- Default language: Latvian; fallback English
- Ad content itself is single-language (whatever the merchant types) — not auto-translated in MVP

## Data model (Lovable Cloud)

```
profiles               id (=auth.uid), full_name, phone, created_at
stores                 id, owner_id → profiles, name, slug, category,
                       address, city, lat, lng, logo_url, description,
                       hours_json, phone, website, created_at
ads                    id, store_id → stores, title, description,
                       category, discount_pct, price_original, price_sale,
                       starts_at, ends_at, status (draft/active/paused),
                       cover_image_url, created_at
ad_images              id, ad_id, url, sort_order
ad_views               id, ad_id, viewed_at (aggregated client → server fn)
favorites_server       id, user_id, ad_id  (only if shopper accounts added later;
                       MVP uses localStorage)
```

Storage bucket: `store-assets` (public read) for logos and ad photos.

RLS:
- `stores`, `ads`, `ad_images`: public SELECT for active rows; INSERT/UPDATE/DELETE only by owner via `owner_id = auth.uid()`.
- `profiles`: owner-only read/update.

## Map

Use Google Maps via the existing Lovable connector (Maps JS API for the interactive map; Geocoding through the gateway when merchants enter an address). Markers cluster when zoomed out; clicking opens a deal preview card.

## Notifications (MVP scope)

Browser Web Push for "new deals from stores I saved". Implemented with the browser Notification API + a daily check on app open. Full background push (service worker + VAPID) flagged as a v2 enhancement to keep MVP scope tight.

## Design direction

Before building, I'll generate 3 visual design directions (warm Baltic / modern minimal / bold marketplace) for you to choose from. Trilingual-aware typography (Latin + Cyrillic support).

## Tech / implementation notes

- TanStack Start, file-based routes, Tailwind + shadcn
- Lovable Cloud for auth, DB, storage
- `@/integrations/supabase/client` in components; `createServerFn` + `requireSupabaseAuth` for merchant mutations
- Google Maps connector for map + geocoding (already supported)
- Image uploads to Supabase Storage with client-side resize
- SEO: per-route `head()` metadata; deal pages get og:image from cover photo

## Out of scope for MVP (explicit)

- Shopper accounts and server-side favorites (localStorage only)
- Payments / paid promotion of ads
- In-app messaging between shoppers and stores
- Loyalty programs, coupon codes redemption tracking
- Native mobile apps (responsive PWA only)
- Auto-translation of ad content

## Build order

1. Schema + RLS + storage bucket
2. Auth (email + Google) + merchant onboarding
3. Merchant dashboard: store profile, ad CRUD with image upload
4. Public deals list + filters + deal detail
5. Map view with Google Maps + clustering
6. Favorites (localStorage) + saved-store notifications
7. i18n wiring (EN/LV/RU) across all surfaces
8. SEO metadata, home page polish, for-merchants landing

Ready to generate design directions and start building once you approve.
