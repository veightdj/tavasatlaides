import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/use-i18n";
import { AuthShell, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — TavasAtlaides" },
      { name: "description", content: "Create a free TavasAtlaides account and start publishing your store's deals." },
      { property: "og:title", content: "Sign up — TavasAtlaides" },
      { property: "og:description", content: "Create a free TavasAtlaides account and start publishing your store's deals." },
      { property: "og:url", content: "https://superatlaides.lovable.app/signup" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account.");
    navigate({ to: "/login" });
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) { setLoading(false); toast.error(String(result.error)); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthShell title={t.auth.signUp}>
      <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={onGoogle}>
        <GoogleIcon /> {t.auth.continueGoogle}
      </Button>
      <Divider label={t.auth.or} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.auth.fullName}</Label>
          <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{t.auth.signUp}</Button>
      </form>
      <p className="text-sm text-center text-muted-foreground">
        {t.auth.haveAccount} <Link to="/login" className="text-primary font-medium hover:underline">{t.auth.signIn}</Link>
      </p>
    </AuthShell>
  );
}
