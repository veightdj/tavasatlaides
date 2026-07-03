## Goal

Automated safety net that (1) proves every UI string is defined for **all three locales** and (2) blocks new hardcoded user-facing text (Latvian, English, or Russian literals) from slipping into components.

Runs on every `bun test` (and in CI via the existing test command). No runtime cost in production.

---

## What gets checked

### 1. Dictionary parity — `src/i18n/__tests__/dictionaries.parity.test.ts`

For `dict.lv`, `dict.en`, `dict.ru`:

- **Same key set** at every depth (recursive walk). Missing / extra keys fail with the exact dotted path (`merchant.adTitle`).
- **No empty strings** — every leaf must be a non-empty string (or array of non-empty strings for the few array entries).
- **No cross-language leakage** — heuristic per locale:
  - `ru`: every leaf must contain at least one Cyrillic char AND zero Latvian-only diacritics (`āčēģīķļņšūž`).
  - `lv`: every leaf must contain zero Cyrillic chars. (Latvian diacritics not required — many words are ASCII.)
  - `en`: every leaf must contain zero Cyrillic AND zero Latvian diacritics.
  - Whitelist for unavoidable tokens (brand name `TavasAtlaides`, `€`, digits, punctuation, emoji flags).
- **Array shape parity** — array-valued keys (e.g. `forMerchants.benefits`) must have identical length in all three locales.

### 2. Category translation completeness — `src/i18n/__tests__/categories.parity.test.ts`

Fetches `public.categories` via the publishable client and asserts every row has non-empty `name_lv`, `name_en`, `name_ru`. Skipped when `SUPABASE_URL` env is absent (local offline runs).

### 3. Hardcoded-string lint — `scripts/i18n-lint.ts` + `src/i18n/__tests__/no-hardcoded-strings.test.ts`

AST-based scan (using the TypeScript compiler already in the toolchain) over `src/components/**`, `src/routes/**` (excluding `admin.*`, `_authenticated/*` admin surfaces, and test files).

Flags:
- JSX text nodes containing a Cyrillic char OR a Latvian diacritic OR ≥2 alpha words separated by a space and not wrapped in `{t.…}` / `t()` / a component call.
- String-literal props known to be user-visible (`title`, `placeholder`, `aria-label`, `alt`, `label`, `description`) when the value is a plain literal ≥3 chars matching the language heuristic above.

Ignores:
- Values inside `// i18n-ignore` line comments.
- Values inside `data-*` attributes, `className`, `id`, `key`, `to`, `href`, `type`, `role`, event handlers.
- Test files, `src/i18n/**`, `src/lib/email-templates/**` (emails are localized elsewhere), and the admin surfaces (RU/LV/EN mixing is not a requirement there per prior scope).
- File-level opt-out via `// @i18n-ignore-file` at the top.

Fails the test with a grouped `file:line — "<snippet>"` report and a hint to move the string into `src/i18n/dictionaries.ts`.

### 4. Dev-mode runtime guard — `src/i18n/use-i18n.tsx`

In development only, wrap the returned `t` in a `Proxy` that logs a `console.error` when a resolved value is `undefined`. Zero cost in production (guarded by `import.meta.env.DEV`).

---

## Deliverables

```text
src/i18n/__tests__/dictionaries.parity.test.ts     new
src/i18n/__tests__/categories.parity.test.ts       new
src/i18n/__tests__/no-hardcoded-strings.test.ts    new
scripts/i18n-lint.ts                               new (exports scanFiles for the test)
src/i18n/use-i18n.tsx                              edit (dev proxy)
```

No package additions — uses the bundled `typescript` package and existing `bunx vitest` runner.

## Out of scope

- Auto-translating missing strings (partner-supplied ad titles/descriptions still fall back to LV as agreed).
- Admin console — remains English-only.
- User-generated content (deal/store text authored by merchants).

## Ship criteria

`bunx vitest run src/i18n` passes locally, and running `bunx vitest run` in CI blocks a PR that introduces a bare `"Загрузка..."` in a TSX file or removes a key from one locale but not the others.