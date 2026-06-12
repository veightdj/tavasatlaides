Add a sticky, horizontally-scrollable category pill bar to the Home page that filters featured deals instantly without navigation.

1. **New component: `src/components/CategoryPills.tsx`**
   - Renders pill buttons (icon + inline label) from `useCategories()`
   - Prepends an "All" option with a generic grid icon
   - Horizontal scroll container with hidden scrollbar (`[scrollbar-width:none]`, `[&::-webkit-scrollbar]:hidden`)
   - Active pill highlighted with the category's `color` (or primary brand color for "All")
   - Smooth touch scrolling with `snap-x snap-mandatory` on mobile
   - Accepts `activeSlug` and `onSelect` callback props (no navigation — local state only)
   - Responsive: horizontal scroll on all viewports (unified behavior), consistent pill sizing

2. **Update `src/routes/index.tsx` (Home / Feed)**
   - Add `selectedCategory` state, default `"all"`
   - Wire the featured-deals query to filter by `selectedCategory` when not `"all"`
   - Replace the `<CategoryCircles />` call with `<CategoryPills />`
   - Wrap the category bar in a sticky container:
     - `sticky top-0` (or offset by header height if needed)
     - `z-30` above content
     - `backdrop-blur-md bg-background/80` for glass effect while sticky
     - `border-b border-border/50` subtle separator
   - Keep the existing hero section above the sticky bar
   - Preserve all other sections (PopularStores, Merchant CTA, etc.)

3. **No other files touched**
   - No database migrations needed (categories + color column already exist)
   - No new routes
   - No auth changes
   - No edits to `CategoryCircles.tsx`, `deals.index.tsx`, or admin panel

**Visual spec:**
- Pills: `rounded-full`, `px-4 py-2`, `gap-2` between icon and label, `gap-2` between pills
- Active: solid background (category color or primary), white text, subtle ring
- Inactive: `bg-muted/60` background, `text-foreground`, hover `bg-muted`
- Mobile & desktop: same horizontal scroll strip, no grid fallback
- Transition: `transition-all duration-200` on all pills

**Test checklist:**
- All / individual category pills filter featured deals correctly
- Sticky behavior on scroll
- Touch scroll smooth on mobile
- Active state clearly visible
- "All" resets filter
- No page navigation on click