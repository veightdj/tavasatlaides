import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { Header, Footer } from "@/components/layout/Header";
import { I18nProvider } from "@/i18n/use-i18n";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/CookieConsent";
import { AnalyticsLoader } from "@/components/AnalyticsLoader";
import { supabase } from "@/integrations/supabase/client";
import { HostGuard } from "@/components/HostGuard";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getHostAudience } from "@/lib/audience";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#00C853" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "TavasAtlaides" },
      { name: "application-name", content: "Tavas Atlaides" },
      { property: "og:site_name", content: "TavasAtlaides" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "lv_LV" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dealslv" },
      { title: "Tavasatlaides" },
      { property: "og:title", content: "Tavasatlaides" },
      { name: "twitter:title", content: "Tavasatlaides" },
      { name: "description", content: "- Discover local store ads, discounts, and deals in Jūrmala and Rīga with smart location-based notifications." },
      { property: "og:description", content: "- Discover local store ads, discounts, and deals in Jūrmala and Rīga with smart location-based notifications." },
      { name: "twitter:description", content: "- Discover local store ads, discounts, and deals in Jūrmala and Rīga with smart location-based notifications." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/82bd3321-7668-4604-9007-099e84006bbc/id-preview-ad72beb6--1623bc5b-8cb1-4231-bb1c-eb9187116f21.lovable.app-1780727849429.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/82bd3321-7668-4604-9007-099e84006bbc/id-preview-ad72beb6--1623bc5b-8cb1-4231-bb1c-eb9187116f21.lovable.app-1780727849429.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/icons/icon-152.png" },
      { rel: "apple-touch-icon", sizes: "167x167", href: "/icons/icon-167.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap&subset=latin,latin-ext,cyrillic" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lv">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") qc.invalidateQueries();
      }
      // Bind / unbind OneSignal external id so server-side targeting works.
      try {
        const { setOneSignalExternalId, logoutOneSignal } = await import("@/lib/onesignal");
        if (event === "SIGNED_IN" && session?.user?.id) {
          await setOneSignalExternalId(session.user.id);
        } else if (event === "SIGNED_OUT") {
          await logoutOneSignal();
        }
      } catch (e) {
        console.warn("[onesignal] auth bind failed", e);
      }
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Hide the consumer header/footer on merchant + admin hosts — those audiences
  // get their own chrome from _authenticated/AdminShell layouts.
  const audience = typeof window !== "undefined" ? getHostAudience() : null;
  const showClientChrome = audience === null || audience === "client";

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthSync />
        <HostGuard />
        <div className="flex min-h-screen flex-col">
          {showClientChrome && <Header />}
          <main className={`flex-1 ${showClientChrome ? "pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0" : ""}`}>
            <Outlet />
          </main>
          {showClientChrome && <Footer />}
          {showClientChrome && <MobileBottomNav />}
        </div>
        <Toaster position="top-right" richColors />
        <CookieConsent />
        <AnalyticsLoader />
      </I18nProvider>
    </QueryClientProvider>
  );
}

