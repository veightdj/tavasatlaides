import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Briefcase, Tag, Image as ImageIcon, ShieldCheck, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthState = "checking" | "anon" | "not-admin" | "admin";

const nav: Array<{ to: string; label: string; icon: any; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/businesses", label: "Businesses", icon: Briefcase },
  { to: "/admin/companies", label: "Companies", icon: Building2 },
  { to: "/admin/deals", label: "Deals", icon: Tag },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/trust", label: "Trust & Reports", icon: ShieldCheck },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>("checking");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        setAuth("anon");
        window.location.href = "/login?redirect=" + encodeURIComponent(pathname);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!mounted) return;
      setAuth(roles?.some((r) => r.role === "admin") ? "admin" : "not-admin");
    })();
    return () => { mounted = false; };
  }, [pathname]);

  if (auth === "checking" || auth === "anon") {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  if (auth === "not-admin") {
    return (
      <div className="mx-auto max-w-md p-10 text-center space-y-4">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="text-muted-foreground text-sm">
          Your account doesn't have admin privileges.
        </p>
        <Button asChild variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-56 shrink-0">
            <div className="rounded-2xl border bg-card p-2 sticky top-4">
              <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Admin</div>
              <nav className="flex md:flex-col gap-1 overflow-x-auto">
                {nav.map((n) => {
                  const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to as any}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                        active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
          <main className="flex-1 min-w-0">
            <header className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            </header>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
