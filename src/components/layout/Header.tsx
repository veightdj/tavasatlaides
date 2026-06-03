import { Link, useRouter } from "@tanstack/react-router";
import logoUrl from "@/assets/logo.svg";
import { useState } from "react";
import { Menu, X, MapPin, Heart, Store as StoreIcon, LogOut, LayoutDashboard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, LANGS } from "@/i18n/use-i18n";
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
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const navLinks = (
    <>
      <Link to="/deals" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        {t.nav.deals}
      </Link>
      <Link to="/stores" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        {t.nav.stores}
      </Link>
      <Link to="/nearby" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        <span className="inline-flex items-center gap-1"><Bell className="h-4 w-4" /> Near me</span>
      </Link>
      <Link to="/map" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {t.nav.map}</span>
      </Link>
      <Link to="/favorites" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {t.nav.favorites}</span>
      </Link>
      <Link to="/for-merchants" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>
        {t.nav.forMerchants}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 min-w-0" onClick={() => setOpen(false)}>
          <img src={logoUrl} alt={t.appName} className="h-9 w-9 shrink-0 rounded-xl object-scale-down" />
          <span className="text-lg font-bold tracking-tight truncate">{t.appName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">{navLinks}</nav>

        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="font-semibold uppercase">{lang}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>{l.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><StoreIcon className="h-4 w-4 mr-2" /> {t.cta.dashboard}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" />{t.merchant.dashboard}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/ads">{t.merchant.ads}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/store">{t.merchant.store}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" />{t.cta.signOut}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">{t.cta.signIn}</Link></Button>
              <Button asChild size="sm"><Link to="/signup">{t.cta.postAd}</Link></Button>
            </>
          )}
        </div>

        <button
          className="md:hidden inline-flex h-11 w-11 items-center justify-center -mr-2 rounded-md hover:bg-muted active:bg-muted transition"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed inset-x-0 top-16 z-40 border-t border-border/60 bg-background max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-2">
              <div className="flex flex-col" onClick={() => setOpen(false)}>
                {[
                  { to: "/deals", label: t.nav.deals },
                  { to: "/stores", label: t.nav.stores },
                  { to: "/nearby", label: "Near me", icon: Bell },
                  { to: "/map", label: t.nav.map, icon: MapPin },
                  { to: "/favorites", label: t.nav.favorites, icon: Heart },
                  { to: "/for-merchants", label: t.nav.forMerchants },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex items-center gap-2 min-h-11 px-2 py-3 rounded-md text-base font-medium hover:bg-muted active:bg-muted transition"
                    activeProps={{ className: "text-primary" }}
                  >
                    {l.icon ? <l.icon className="h-5 w-5" /> : null}
                    {l.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border/60">
                {LANGS.map((l) => (
                  <Button key={l.code} size="sm" className="min-h-10" variant={lang === l.code ? "default" : "ghost"} onClick={() => setLang(l.code)}>
                    {l.label}
                  </Button>
                ))}
              </div>
              {user ? (
                <div className="flex flex-col gap-2 pt-2">
                  <Button asChild variant="outline" className="min-h-11" onClick={() => setOpen(false)}><Link to="/dashboard">{t.merchant.dashboard}</Link></Button>
                  <Button variant="ghost" className="min-h-11" onClick={() => { setOpen(false); signOut(); }}>{t.cta.signOut}</Button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="ghost" className="flex-1 min-h-11" onClick={() => setOpen(false)}><Link to="/login">{t.cta.signIn}</Link></Button>
                  <Button asChild className="flex-1 min-h-11" onClick={() => setOpen(false)}><Link to="/signup">{t.cta.postAd}</Link></Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 bg-muted/30 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} {t.appName}</span>
        <div className="flex gap-6">
          <Link to="/about" className="hover:text-foreground">{t.nav.about}</Link>
          <Link to="/for-merchants" className="hover:text-foreground">{t.nav.forMerchants}</Link>
        </div>
      </div>
    </footer>
  );
}
