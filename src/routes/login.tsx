import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/use-i18n";
import { AUDIENCE_HOME, getHostAudience } from "@/lib/audience";


export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TavasAtlaides" },
      { name: "description", content: "Sign in to your TavasAtlaides account to manage your store and deals." },
      { property: "og:title", content: "Sign in — TavasAtlaides" },
      { property: "og:description", content: "Sign in to your TavasAtlaides account to manage your store and deals." },
      { property: "og:url", content: "https://superatlaides.lovable.app/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // After auth, land on the home of whichever host we're on. Sessions are
  // localStorage-per-origin, so we must NOT cross-host redirect here.
  // A `next`/`redirect` search param (e.g. the OAuth consent page) wins when it
  // is a safe same-origin relative path.
  const destination = (() => {
    const requested = search.next ?? search.redirect;
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) return requested;
    const h = getHostAudience();
    return h ? AUDIENCE_HOME[h] : "/profile";
  })();


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    window.location.assign(destination);
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + destination });
    if (result.error) {
      setLoading(false);
      toast.error(String(result.error));
      return;
    }
    if (result.redirected) return;
    window.location.assign(destination);
  };


  return (
    <AuthShell title={t.auth.signIn}>
      <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={onGoogle}>
        <GoogleIcon /> {t.auth.continueGoogle}
      </Button>
      <Divider label={t.auth.or} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              {t.auth.forgot}
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{t.auth.signIn}</Button>
      </form>
      <p className="text-sm text-center text-muted-foreground">
        {t.auth.noAccount} <Link to="/signup" className="text-primary font-medium hover:underline">{t.auth.signUp}</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" /><span>{label}</span><div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853"/>
      <path d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38z" fill="#EA4335"/>
    </svg>
  );
}
