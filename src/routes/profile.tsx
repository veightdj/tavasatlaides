import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  User, Heart, Bell, MapPin, SlidersHorizontal, ShieldQuestion,
  ChevronRight, LayoutDashboard, Megaphone, Plus, Store as StoreIcon,
  TrendingUp, CreditCard, Inbox, Building2, KeyRound, LogIn, UserPlus,
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
import { getProfileVisibility } from "@/lib/profile-visibility";

const TILE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard, ads: Megaphone, "ads-new": Plus,
  store: StoreIcon, analytics: TrendingUp, billing: CreditCard,
};
const TILE_LABEL_KEY: Record<string, "dashboard" | "ads" | "newAd" | "store" | null> = {
  dashboard: "dashboard", ads: "ads", "ads-new": "newAd", store: "store",
  analytics: null, billing: null,
};

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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-8 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-8">
        <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-8">
      {user ? <ProfileHub /> : <GuestProfile />}
    </div>
  );
}

function GuestProfile() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-brand-soft text-primary grid place-items-center overflow-hidden shrink-0">
          <User className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.nav.profile}</h1>
          <p className="text-sm text-muted-foreground">Pieslēdzies, lai redzētu savu profilu</p>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Pieslēdzies, lai saglabātu mīļākos piedāvājumus, saņemtu paziņojumus un pārvaldītu savu kontu.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button asChild className="w-full min-h-11">
            <Link to="/login" search={{ redirect: "/profile" }}>
              <LogIn className="h-4 w-4 mr-2" />Pieslēgties
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full min-h-11">
            <Link to="/signup">
              <UserPlus className="h-4 w-4 mr-2" />Reģistrēties
            </Link>
          </Button>
        </div>
      </section>

      <Section title="Activity">
        <NavRow to="/favorites" icon={Heart} label={t.favorites.title} />
        <NavRow to="/nearby" icon={MapPin} label={t.bottomNav.nearMe} />
      </Section>

      <Section title="Preferences">
        <Accordion type="single" collapsible className="rounded-2xl border bg-card divide-y">
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
    </div>
  );
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
    <div className="space-y-8">
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

      {user && !store && vis.businessTiles.length === 0 && (
        <Section title="Become a partner">
          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-brand-soft p-5 text-center">
            <StoreIcon className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium">Have a business? Create your store to start posting deals.</p>
            <Button asChild className="mt-3">
              <Link to="/profile/store">
                <Plus className="h-4 w-4 mr-1" /> Create My Store
              </Link>
            </Button>
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
        <NavRow to="/profile/security" icon={KeyRound} label="Security &amp; password" />
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
