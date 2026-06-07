## Add "Switch to merchant portal" link in the client app user menu

### Goal
Give logged-in users on the client app (tavasatlaides.lv) a clear way to jump to the merchant portal (partner.tavasatlaides.lv).

### Changes

1. **Translations**
   - Add `nav.switchToMerchant` key to `src/i18n/dictionaries.ts` in `lv`, `en`, and `ru`:
     - LV: "Pārslēgties uz veikala portālu"
     - EN: "Switch to merchant portal"
     - RU: "Перейти в портал магазина"

2. **Header component (`src/components/layout/Header.tsx`)**
   - Import `getHostAudience` and `buildAudienceUrl` from `@/lib/audience`.
   - In the **desktop** logged-in dropdown menu (below the existing merchant items, above Settings or as a distinct separator row), add:
     - A `DropdownMenuItem` with label from `t.nav.switchToMerchant`.
     - On production client host (`getHostAudience() === "client"`), render an `<a>` with `href={buildAudienceUrl("merchant", "/dashboard")}`.
     - On preview/localhost, render `<Link to="/dashboard">` so it works on single-domain previews.
     - Icon: `Store` (or `ArrowUpRight` if preferred).
   - In the **mobile** logged-in menu block, add the same link as a full-width button above the existing Dashboard/Settings buttons.

3. **No other files touched.**

### Behavior
- On `tavasatlaides.lv` (production client host), clicking the link navigates to `https://partner.tavasatlaides.lv/dashboard`.
- On preview/localhost, clicking the link navigates to `/dashboard` within the same preview domain.
- The link only appears when the user is authenticated (same guard as the existing user menu).