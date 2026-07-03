# Strict RU / LV / EN localization

Enforce full language isolation. Focus on the two current leaks:
DB category names (currently Latvian for everyone) and a handful of
routes/components that fall back to Latvian slugs or English literals.

## 1. Database — per-locale category names

Add three columns to `public.categories` and backfill from the current
Latvian `name`, plus English/Russian translations for the 11 existing
categories.

```
name_lv text  -- required going forward
name_en text
name_ru text
```

Backfill map (by slug):

```text
food         LV Ēdiens      EN Food         RU Еда
auto         LV Auto        EN Auto         RU Авто
beauty       LV Skaistums   EN Beauty       RU Красота
electronics  LV Elektronika EN Electronics  RU Электроника
home         LV Mājai       EN Home         RU Для дома
kids         LV Bērniem     EN Kids         RU Детям
cafes        LV Kafejnīcas  EN Cafes        RU Кафе
events       LV Pasākumi    EN Events       RU События
dzivnieki    LV Dzīvnieki   EN Pets         RU Животные
veikali      LV Veikali     EN Shops        RU Магазины
sports       LV Sports      EN Sports       RU Спорт
```

Admin category form is extended so new categories require all three
names before save.

## 2. Category resolver (client)

Introduce `useLocalizedCategoryName(slug)` and
`localizeCategory(cat, locale)` that read `name_lv/en/ru` off the
categories query. Rule: if the row's field for the active locale is
missing, render the slug itself (never another language's name).

Replace every current call site that reads `c.name` or falls back to
another language:

- `src/components/CategoryCircles.tsx`
- `src/components/CategoryCirclesFilter.tsx`
- `src/components/CategoryPills.tsx`
- `src/components/DealCard.tsx` (categoryLabel)
- `src/routes/stores.$id.tsx` (categoryLabel)
- `src/routes/deals.$id.tsx` (category chip)
- `src/routes/categories.$slug.tsx` (h1 + `<head>` title)
- `src/routes/admin.categories.tsx` (list + editor)

The static `t.cat` dictionary and inline `CATEGORY_LABEL` maps are
removed — DB is the single source of truth so admins can add
categories without a code change.

## 3. Route metadata per locale

`categories.$slug.tsx` currently hard-codes an English title. Move
title/description into `head()` built from the resolved localized
name for the active locale, with `og:url` and canonical pointed at
`/categories/{slug}`. `robots: noindex` on the fallback state where
the localized name is missing, so untranslated categories don't get
indexed in the wrong language.

## 4. UI audit — remove residual English literals

Sweep and route through `useI18n()` any hard-coded strings still in
components that ship to end users. Known offenders to fix:

- `categories.$slug.tsx`: "Loading…", "404"
- Any `placeholder="…"` / `aria-label="…"` still in English inside
  `src/components/**` and `src/routes/**` that are not admin-only.

Admin routes (`src/routes/admin.*`, `src/components/admin/**`) stay
English by policy — they are staff tools, not end-user UI.

## 5. Language switch behavior

`useI18n` already reruns render on locale change. Add a
`queryClient.invalidateQueries({ queryKey: ["categories"] })` on
locale change so the categories query re-derives labels immediately
without a full reload.

## 6. Out of scope (called out explicitly)

- User-generated content — deal titles, ad descriptions, store
  descriptions — stays in whatever language the merchant wrote it in.
  Auto-translating merchant copy is a separate feature and not part
  of this pass.
- Emails and OneSignal push templates already have their own locale
  handling; not touched here.

## Technical notes

- Migration adds the three columns as nullable, backfills the 11
  existing rows, then sets `name_lv NOT NULL` (LV is the site's
  base admin language). `name_en` / `name_ru` stay nullable so the
  resolver's "show slug" rule is the guardrail against half-translated
  new rows rather than a hard DB constraint.
- `useCategories()` selects the new columns; consumers get a typed
  `{ nameLv, nameEn, nameRu }` shape via a thin mapper.
- No GRANT changes — `categories` already exposes SELECT to anon.
