import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
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
    { to: "/store", label: t.merchant.store, icon: Store },
    { to: "/ads", label: t.merchant.ads, icon: Megaphone },
    { to: "/ads/new", label: t.merchant.newAd, icon: Plus },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[220px_1fr] gap-8">
      <aside className="md:sticky md:top-20 self-start">
        <nav className="flex md:flex-col gap-1 overflow-auto">
          {items.map((it) => {
            const active = pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
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
    </div>
  );
}
