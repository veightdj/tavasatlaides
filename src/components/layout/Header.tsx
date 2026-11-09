import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Search,
  Store as StoreIcon,
  User,
} from "lucide-react";
import logoAsset from "@/assets/tavasatlaides-logo.svg.asset.json";
import { Button } from "@/components/ui/button";
import { useI18n, LANGS } from "@/i18n/use-i18n";
import { buildAudienceUrl, getHostAudience } from "@/lib/audience";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/lib/categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const logoUrl = logoAsset.url;

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const isMarketing = (typeof window !== "undefined" ? getHostAudience() : null) === "client";
  const h = t.homePages.marketplace;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      router.navigate({ to: "/deals" });
      return;
    }
    router.navigate({ to: "/deals", search: { q } });
  };

  const selectCity = (value: string) => {
    setCity(value);
    router.navigate({ to: "/deals", search: { city: value === "all" ? undefined : value } });
  };

  const appUrl = buildAudienceUrl("app", "/");
  const navLinks = isMarketing ? (
    <>
      <HeaderLink to="/about">{t.nav.about}</HeaderLink>
      <HeaderLink to="/for-merchants">{t.nav.forMerchants}</HeaderLink>
      <HeaderLink to="/faq">FAQ</HeaderLink>
      <HeaderLink to="/contact">{h.contact}</HeaderLink>
    </>
  ) : (
    <>
      <HeaderLink to="/deals">{t.nav.deals}</HeaderLink>
      <HeaderLink to="/stores">{t.nav.stores}</HeaderLink>
      <HeaderLink to="/nearby">{t.bottomNav.nearMe}</HeaderLink>
      <HeaderLink to="/map">{t.nav.map}</HeaderLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-4 lg:gap-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <img src={logoUrl} alt={t.appName} className="block h-9 w-9 shrink-0 rounded-xl object-cover" />
          <span className="hidden text-lg font-extrabold tracking-[-0.04em] min-[380px]:inline">{t.appName}</span>
        </Link>

        {!isMarketing && (
          <div className="hidden xl:block">
            <Select value={city} onValueChange={selectCity}>
              <SelectTrigger className="h-9 w-[128px] border-0 bg-transparent px-2 text-xs font-semibold shadow-none">
                <MapPin className="h-4 w-4 text-primary" />
                <SelectValue placeholder={t.deals.city} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.city.all}</SelectItem>
                {CITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "Riga" ? t.city.riga : t.city.jurmala}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="hidden items-center gap-5 lg:flex">{navLinks}</nav>

        {!isMarketing && (
          <form onSubmit={submitSearch} role="search" aria-label={h.searchLabel} className="mx-2 hidden min-w-0 flex-1 md:flex">
            <label className="flex h-10 w-full items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 transition focus-within:border-primary/50 focus-within:bg-card">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={h.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </form>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {!isMarketing && (
            <Button asChild variant="ghost" size="icon" className="hidden rounded-full md:inline-flex" aria-label={t.nav.favorites}>
              <Link to="/favorites"><Heart className="h-[18px] w-[18px]" /></Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full px-2 font-semibold uppercase">{lang}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map((item) => (
                <DropdownMenuItem key={item.code} onClick={() => setLang(item.code)}>{item.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="ghost" size="icon" className="rounded-full md:hidden" aria-label={user ? t.nav.profile : t.cta.signIn}>
            <Link to={user ? "/profile" : "/login"}><User className="h-5 w-5" /></Link>
          </Button>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full"><User className="h-4 w-4" />{t.nav.profile}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><LayoutDashboard className="h-4 w-4" />{t.nav.profile}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/dashboard"><StoreIcon className="h-4 w-4" />{t.merchant.dashboard}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites"><Heart className="h-4 w-4" />{t.nav.favorites}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" />{t.cta.signOut}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isMarketing ? (
              <Button asChild size="sm" className="rounded-full"><a href={appUrl}>{t.cta.browse}</a></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/login">{t.cta.signIn}</Link></Button>
                <Button asChild size="sm" className="hidden rounded-full lg:inline-flex"><Link to="/signup">{t.cta.signUp}</Link></Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: "/about" | "/for-merchants" | "/faq" | "/contact" | "/deals" | "/stores" | "/nearby" | "/map"; children: React.ReactNode }) {
  return (
    <Link to={to} className="whitespace-nowrap text-[13px] font-semibold text-muted-foreground transition hover:text-primary" activeProps={{ className: "text-primary" }}>
      {children}
    </Link>
  );
}

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const h = t.homePages.marketplace;

  return (
    <footer className="mt-4 hidden border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)] md:block">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src={logoUrl} alt={t.appName} className="h-9 w-9 rounded-xl object-cover" />
              <span className="text-base font-extrabold tracking-tight">{t.appName}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{t.tagline}</p>
          </div>
          <FooterColumn title={h.footerDiscovery}>
            <Link to="/deals" className="hover:text-primary">{t.nav.deals}</Link>
            <Link to="/stores" className="hover:text-primary">{t.nav.stores}</Link>
            <Link to="/nearby" className="hover:text-primary">{t.bottomNav.nearMe}</Link>
            <Link to="/map" className="hover:text-primary">{t.nav.map}</Link>
          </FooterColumn>
          <FooterColumn title={h.footerSupport}>
            <Link to="/about" className="hover:text-primary">{t.nav.about}</Link>
            <Link to="/faq" className="hover:text-primary">{h.howItWorks}</Link>
            <Link to="/contact" className="hover:text-primary">{h.contact}</Link>
            <Link to="/for-merchants" className="hover:text-primary">{t.nav.forMerchants}</Link>
          </FooterColumn>
          <FooterColumn title={t.nav.privacy}>
            <Link to="/privacy" className="hover:text-primary">{t.nav.privacy}</Link>
            <Link to="/terms" className="hover:text-primary">{t.nav.terms}</Link>
            <Link to="/cookie-policy" className="hover:text-primary">{t.nav.cookies}</Link>
          </FooterColumn>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          © {year} {t.appName}. {h.footerRights}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav className="flex flex-col gap-2.5 text-sm text-muted-foreground">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      {children}
    </nav>
  );
}
