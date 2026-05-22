## Goal
Display all prices with exactly two decimals (e.g. `5.00`, `12.50`, `99.99`).

## Change
Update `formatPrice` in `src/lib/utils.ts` to always return `n.toFixed(2)` — drop the integer / trailing-zero stripping logic.

```ts
export function formatPrice(value: number | string | null | undefined): string {
  if (value == null) return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}
```

That's it — every caller (DealCard, deals list, deal detail, stores, favorites, categories, AdEditor) already routes through `formatPrice`, so this single edit updates the whole app.