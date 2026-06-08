import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MapPin, Map as MapIcon, Heart, Settings as SettingsIcon } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { getHostAudience } from "@/lib/audience";


type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

export function MobileBottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide on merchant/admin sections — they have their own shell.
  const isMerchant =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/ads") ||
    pathname.startsWith("/store");
  const isAdmin = pathname.startsWith("/admin");
  if (isMerchant || isAdmin) return null;

  // Hide on auth flows
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;

  const tabs: Tab[] = [
    {
      to: "/",
      label: t.bottomNav.home,
      icon: Home,
      match: (p) => p === "/",
    },
    {
      to: "/nearby",
      label: t.bottomNav.nearMe,
      icon: MapPin,
      match: (p) => p.startsWith("/nearby") || p.startsWith("/near-me"),
    },
    {
      to: "/map",
      label: t.bottomNav.map,
      icon: MapIcon,
      match: (p) => p.startsWith("/map"),
    },
    {
      to: "/favorites",
      label: t.bottomNav.saved,
      icon: Heart,
      match: (p) => p.startsWith("/favorites") || p.startsWith("/saved"),
    },
    {
      to: "/settings",
      label: t.bottomNav.settings,
      icon: SettingsIcon,
      match: (p) => p.startsWith("/settings"),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={`group relative flex flex-col items-center justify-center gap-0.5 min-h-[58px] px-1 py-1.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
                    active ? "bg-primary/10" : "bg-transparent"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                </span>
                <span
                  className={`text-[10.5px] leading-none font-medium tracking-tight min-[360px]:block hidden ${
                    active ? "" : "opacity-90"
                  }`}
                >
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
