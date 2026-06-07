Since the bottom navigation now handles primary mobile navigation, hide the entire top header on mobile devices (`< md` breakpoint) and in installed apps.

Changes:

1. **Header.tsx** — Add `hidden md:block` to the `<header>` element so the entire top chrome (logo, hamburger, mobile dropdown, desktop nav) is hidden below the `md` breakpoint.

2. **__root.tsx** — Add `pt-[env(safe-area-inset-top)] md:pt-0` to the `<main>` container when `showClientChrome` is true, compensating for the missing header safe-area padding on mobile.

Result: mobile and app users see only the bottom 5-icon nav. Desktop retains the full sticky header.