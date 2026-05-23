import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Store, Megaphone, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setAuthed(!!session);
      setChecking(false);
      if (!session) {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (checking) return <div className="p-10 text-center text-muted-foreground">{t.common.loading}</div>;
  if (!authed) return null;

  const items = [
    { to: "/dashboard", label: t.merchant.dashboard, icon: LayoutDashboard },
    { to: "/ads", label: t.merchant.ads, icon: Megaphone },
    { to: "/ads/new", label: t.merchant.newAd, icon: Plus },
    { to: "/store", label: t.merchant.store, icon: Store },
  ];

  const isActive = (to: string) =>
    pathname === to || (to !== "/dashboard" && pathname.startsWith(to));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 md:grid md:grid-cols-[220px_1fr] md:gap-8 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-8">
      {/* Desktop sidebar — unchanged */}
      <aside className="hidden md:block md:sticky md:top-20 self-start">
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const active = isActive(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"}`}
              >
                <it.icon className="h-4 w-4" />{it.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <Outlet />
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
        aria-label="Merchant navigation"
      >
        <ul className="grid grid-cols-4">
          {items.map((it) => {
            const active = isActive(it.to);
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-2 py-2 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <it.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                  <span className="truncate max-w-full">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
