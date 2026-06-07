import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Heart, Bell } from "lucide-react";
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
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-12 pb-24 md:pb-12 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.bottomNav.profile}</h1>
      </header>

      <nav className="rounded-2xl border bg-card divide-y">
        <Row to="/favorites" icon={Heart} label={t.bottomNav.saved} />
        <Row to="/settings/notifications" icon={Bell} label="Notifications" />
      </nav>
    </div>
  );
}

function Row({ to, icon: Icon, label }: { to: string; icon: typeof Heart; label: string }) {
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
