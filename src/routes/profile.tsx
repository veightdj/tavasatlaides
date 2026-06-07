import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Settings as SettingsIcon, ChevronRight, LogIn, LogOut, Heart, Bell, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profils — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-12 pb-24 md:pb-12 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.bottomNav.profile}</h1>
        {user && (
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        )}
      </header>

      {!loading && !user && (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <UserIcon className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold">{t.cta.signIn}</h2>
              <p className="text-sm text-muted-foreground">
                {t.cta.signIn} — {t.bottomNav.profile}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button asChild className="w-full sm:w-auto min-h-11">
              <Link to="/login"><LogIn className="h-4 w-4 mr-2" />{t.cta.signIn}</Link>
            </Button>
          </div>
        </div>
      )}

      <nav className="rounded-2xl border bg-card divide-y">
        <Row to="/favorites" icon={Heart} label={t.bottomNav.saved} />
        <Row to="/settings/notifications" icon={Bell} label="Notifications" />
        <Row to="/settings" icon={SettingsIcon} label={t.nav.settings} />
      </nav>

      {!loading && user && (
        <div className="flex justify-end">
          <Button variant="outline" className="min-h-11" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            {t.cta.signOut}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ to, icon: Icon, label }: { to: string; icon: typeof SettingsIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-4 hover:bg-muted/40 transition first:rounded-t-2xl last:rounded-b-2xl"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}
