import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MapPin, Map as MapIcon, Heart, User, Store as StoreIcon } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { getHostAudience } from "@/lib/audience";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

export function MobileBottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [host, setHost] = useState<ReturnType<typeof getHostAudience>>(null);
  const { user } = useAuth();
  useEffect(() => setHost(getHostAudience()), []);

  const { data: partnerNav } = useQuery({
    queryKey: ["bottom-nav-partner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const isPartner = (roles ?? []).some(
        (r) => r.role === "partner" || r.role === "admin"
      );
      return { isPartner };
    },
  });

  const isPartner = partnerNav?.isPartner ?? false;

  // Hide on the marketing site
  if (host === "client") return null;

  // Hide on admin sections and auth flows; otherwise always visible
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;

  const baseTabs: Tab[] = [
    { to: "/", label: t.bottomNav.home, icon: Home, match: (p) => p === "/" },
    { to: "/nearby", label: t.bottomNav.nearMe, icon: MapPin, match: (p) => p.startsWith("/nearby") || p.startsWith("/near-me") },
    { to: "/map", label: t.bottomNav.map, icon: MapIcon, match: (p) => p.startsWith("/map") },
    { to: "/favorites", label: t.bottomNav.saved, icon: Heart, match: (p) => p.startsWith("/favorites") || p.startsWith("/saved") },
    { to: "/profile", label: t.bottomNav.profile, icon: User, match: (p) => p.startsWith("/profile") },
  ];

  // Partner: replace Map with Store for one-tap access from any screen
  const tabs: Tab[] = isPartner
    ? [
        baseTabs[0],
        baseTabs[1],
        {
          to: "/profile/store",
          label: (t.merchant as any)?.store ?? "Store",
          icon: StoreIcon,
          match: (p) => p.startsWith("/profile/store") || p.startsWith("/profile/ads") || p.startsWith("/profile/dashboard"),
        },
        baseTabs[3],
        baseTabs[4],
      ]
    : baseTabs;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1 sm:px-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="min-w-0">
              <Link
                to={tab.to}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={`group relative flex flex-col items-center justify-start gap-1 min-h-[56px] px-0.5 pt-1.5 pb-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-12 shrink-0 items-center justify-center rounded-full transition-all sm:h-8 sm:w-14 ${
                    active ? "bg-primary/10" : "bg-transparent"
                  }`}
                >
                  <Icon className={`h-[22px] w-[22px] sm:h-6 sm:w-6 transition-transform ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={`w-full truncate text-[10px] sm:text-[10.5px] leading-tight font-medium tracking-tight text-center min-[360px]:block hidden ${active ? "" : "opacity-90"}`}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
