import { Link, useRouter } from "@tanstack/react-router";
import logoAsset from "@/assets/tavasatlaides-logo.svg.asset.json";
const logoUrl = logoAsset.url;
import { MapPin, Heart, Store as StoreIcon, LogOut, LayoutDashboard, Bell, ArrowUpRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, LANGS } from "@/i18n/use-i18n";
import { getHostAudience, buildAudienceUrl } from "@/lib/audience";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const isMarketing = (typeof window !== "undefined" ? getHostAudience() : null) === "client";

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const appUrl = buildAudienceUrl("app", "/");

  const marketingLinks = (
    <>
      <Link to="/about" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>{t.nav.about}</Link>
      <Link to="/for-merchants" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>{t.nav.forMerchants}</Link>
      <Link to="/faq" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>FAQ</Link>
      <Link to="/contact" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>Kontakti</Link>
    </>
  );

  const appLinks = (
    <>
      <Link to="/deals" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>{t.nav.deals}</Link>
      <Link to="/stores" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>{t.nav.stores}</Link>
      <Link to="/nearby" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        <span className="inline-flex items-center gap-1"><Bell className="h-4 w-4" /> Near me</span>
      </Link>
      <Link to="/map" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {t.nav.map}</span>
      </Link>
      <Link to="/favorites" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {t.nav.favorites}</span>
      </Link>
      <Link to="/for-merchants" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>{t.nav.forMerchants}</Link>
    </>
  );

  const navLinks = isMarketing ? marketingLinks : appLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img src={logoUrl} alt={t.appName} className="block h-9 w-9 shrink-0 rounded-xl object-cover" />
          <span className="text-lg font-bold tracking-tight truncate leading-none">{t.appName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">{navLinks}</nav>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Language switcher — visible on all screen sizes */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="font-semibold uppercase px-2 md:px-3">{lang}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>{l.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop-only auth controls */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><User className="h-4 w-4 mr-2" /> {t.nav.profile}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><LayoutDashboard className="h-4 w-4 mr-2" />{t.nav.profile}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/dashboard"><StoreIcon className="h-4 w-4 mr-2" />{t.merchant.dashboard}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites"><Heart className="h-4 w-4 mr-2" />{t.nav.favorites}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" />{t.cta.signOut}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isMarketing ? (
              <>
                <Button asChild size="sm" className="rounded-full">
                  <a href={appUrl}>Atvērt lietotni <ArrowUpRight className="h-4 w-4 ml-1" /></a>
                </Button>
                <Button asChild variant="outline" size="sm"><Link to="/for-merchants">{t.nav.forMerchants}</Link></Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/login">{t.cta.signIn}</Link></Button>
                <Button asChild size="sm"><Link to="/signup">{t.cta.postAd}</Link></Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="hidden md:block border-t border-border/60 bg-muted/30 mt-16 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr] gap-8 md:gap-12">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoUrl} alt={t.appName} className="h-9 w-9 rounded-xl object-cover" />
              <span className="text-base font-bold tracking-tight">{t.appName}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">{t.tagline}</p>
          </div>

          <nav aria-label={t.nav.about} className="flex flex-col gap-2 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-1">{t.appName}</h3>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition">{t.nav.about}</Link>
            <Link to="/for-merchants" className="text-muted-foreground hover:text-foreground transition">{t.nav.forMerchants}</Link>
          </nav>

          <nav aria-label={t.nav.privacy} className="flex flex-col gap-2 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-1">{t.nav.privacy}</h3>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition">{t.nav.privacy}</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition">{t.nav.terms}</Link>
            <Link to="/cookie-policy" className="text-muted-foreground hover:text-foreground transition">{t.nav.cookies}</Link>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {year} {t.appName}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
