import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  User, Heart, Bell, MapPin, SlidersHorizontal, ShieldQuestion, LogOut,
  ChevronRight, LayoutDashboard, Megaphone, Plus, Store as StoreIcon,
  TrendingUp, MousePointerClick, CreditCard, Inbox, Building2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n/use-i18n";
import { NotificationPrefsSection } from "@/components/profile/NotificationPrefsSection";
import { AccountActionsSection } from "@/components/profile/AccountActionsSection";
import { PreferencesMisc } from "@/components/profile/PreferencesMisc";
import { getProfileVisibility, PARTNER_TILES } from "@/lib/profile-visibility";

const TILE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard, ads: Megaphone, "ads-new": Plus,
  store: StoreIcon, analytics: TrendingUp, billing: CreditCard,
};
const TILE_LABEL_KEY: Record<string, "dashboard" | "ads" | "newAd" | "store" | null> = {
  dashboard: "dashboard", ads: "ads", "ads-new": "newAd", store: "store",
  analytics: null, billing: null,
};

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profils — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileLayout,
});

function ProfileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Render sub-route when not on /profile itself
  if (pathname !== "/profile" && pathname !== "/profile/") return <Outlet />;
  return <ProfileHub />;
}

function ProfileHub() {
  const { t } = useI18n();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: store } = useQuery({
    queryKey: ["my-store-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id,name,city,logo_url").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: roleRows } = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });

  const vis = getProfileVisibility({
    userId: user?.id ?? null,
    roles: roleRows ?? [],
    hasStore: !!store,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-brand-soft text-primary grid place-items-center overflow-hidden shrink-0">
          <User className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            {profile?.full_name || user?.email?.split("@")[0] || t.nav.profile}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          {vis.showPartnerBadge && <span data-testid="partner-badge" className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5"><Building2 className="h-3 w-3" />Partner</span>}
        </div>
      </header>

      {vis.businessTiles.length > 0 && (
        <Section title="Business">
          <PartnerOverview store={store} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vis.businessTiles.map((tile) => {
              const Icon = TILE_ICONS[tile.id] ?? LayoutDashboard;
              const i18nKey = TILE_LABEL_KEY[tile.id];
              const label = i18nKey ? (t.merchant as any)[i18nKey] : tile.label;
              return <Tile key={tile.id} to={tile.to} icon={Icon} label={label} primary={tile.id === "ads-new"} />;
            })}
          </div>
        </Section>
      )}

      <Section title="Activity">
        <NavRow to="/favorites" icon={Heart} label={t.favorites.title} />
        <NavRow to="/profile/notifications" icon={Inbox} label="Notifications" />
        <NavRow to="/nearby" icon={MapPin} label={t.bottomNav.nearMe} />
      </Section>

      <Section title="Preferences">
        <Accordion type="single" collapsible className="rounded-2xl border bg-card divide-y">
          <AccordionItem value="notif" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4" />Notifications</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-5"><NotificationPrefsSection /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="misc" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" />Language &amp; theme</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-5"><PreferencesMisc /></AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Support">
        <NavRow to="/faq" icon={ShieldQuestion} label="Help &amp; FAQ" />
        <NavRow to="/contact" icon={ShieldQuestion} label="Contact" />
        <NavRow to="/terms" icon={ShieldQuestion} label={t.nav.terms} />
        <NavRow to="/privacy" icon={ShieldQuestion} label={t.nav.privacy} />
        <NavRow to="/cookie-policy" icon={ShieldQuestion} label={t.nav.cookies} />
      </Section>

      <Section title="Account">
        <AccountActionsSection />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function NavRow({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 hover:bg-muted/60 active:bg-muted transition">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function Tile({ to, icon: Icon, label, primary }: { to: string; icon: any; label: string; primary?: boolean }) {
  return (
    <Button asChild variant={primary ? "default" : "outline"} className="h-auto min-h-[64px] flex-col gap-1 rounded-2xl py-3 px-2 text-xs font-semibold">
      <Link to={to}>
        <Icon className="h-5 w-5" />
        <span className="truncate w-full text-center">{label}</span>
      </Link>
    </Button>
  );
}

function PartnerOverview({ store }: { store: any }) {
  if (!store) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-brand-soft p-5 text-center">
        <p className="text-sm">Set up your store to start posting deals.</p>
        <Button asChild className="mt-3"><Link to="/profile/store">Set up store</Link></Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      {store.logo_url
        ? <img src={store.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
        : <div className="h-12 w-12 rounded-xl bg-gradient-warm" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{store.name}</p>
        <p className="text-xs text-muted-foreground truncate">{store.city}</p>
      </div>
      <Button asChild variant="ghost" size="sm"><Link to="/profile/store">Edit</Link></Button>
    </div>
  );
}
