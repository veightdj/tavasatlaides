import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/use-i18n";
import { AuthShell, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — TavasAtlaides" },
      { name: "description", content: "Create a free TavasAtlaides account — for shoppers or businesses." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/signup" }],
  }),
  component: SignupPage,
});

type AccountKind = "client" | "partner";

function SignupPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<AccountKind>("client");

  return (
    <AuthShell title={t.auth.signUp}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as AccountKind)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="client" className="gap-2"><UserIcon className="h-4 w-4" />Client</TabsTrigger>
          <TabsTrigger value="partner" className="gap-2"><Building2 className="h-4 w-4" />Partner</TabsTrigger>
        </TabsList>
        <TabsContent value="client" className="pt-6 space-y-6"><ClientSignup /></TabsContent>
        <TabsContent value="partner" className="pt-6 space-y-6"><PartnerSignup /></TabsContent>
      </Tabs>
      <p className="text-sm text-center text-muted-foreground">
        {t.auth.haveAccount} <Link to="/login" className="text-primary font-medium hover:underline">{t.auth.signIn}</Link>
      </p>
    </AuthShell>
  );
}

async function assignRole(userId: string, role: AccountKind) {
  // Idempotent: ignore unique-violation if a row already exists.
  await supabase.from("user_roles").insert({ user_id: userId, role });
}

function ClientSignup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return toast.error(t.auth.agreeRequired);
    setLoading(true);
    const acceptedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/profile",
        data: { full_name: fullName, account_type: "client", terms_accepted_at: acceptedAt },
      },
    });
    if (!error && data.user) {
      await supabase.from("profiles").update({ terms_accepted_at: acceptedAt }).eq("id", data.user.id);
      if (data.session) await assignRole(data.user.id, "client");
    }
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account.");
    navigate({ to: "/login" });
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/profile" });
    if (result.error) { setLoading(false); toast.error(String(result.error)); return; }
    if (result.redirected) return;
    window.location.assign("/profile");
  };

  return (
    <>
      <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={onGoogle}>
        <GoogleIcon /> {t.auth.continueGoogle}
      </Button>
      <Divider label={t.auth.or} />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="c-name" label={t.auth.fullName} value={fullName} onChange={setFullName} autoComplete="name" required />
        <Field id="c-email" type="email" label={t.auth.email} value={email} onChange={setEmail} autoComplete="email" required />
        <Field id="c-password" type="password" label={t.auth.password} value={password} onChange={setPassword} autoComplete="new-password" minLength={8} required />
        <TermsCheckbox checked={accepted} onChange={setAccepted} />
        <Button type="submit" className="w-full" disabled={loading || !accepted}>{t.auth.signUp}</Button>
      </form>
    </>
  );
}

function PartnerSignup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return toast.error(t.auth.agreeRequired);
    setLoading(true);
    const acceptedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone: phone || undefined,
      options: {
        emailRedirectTo: window.location.origin + "/profile/store",
        data: {
          full_name: companyName,
          account_type: "partner",
          company_name: companyName,
          registration_number: regNumber,
          phone,
          terms_accepted_at: acceptedAt,
        },
      },
    });
    if (!error && data.user) {
      await supabase.from("profiles").update({ terms_accepted_at: acceptedAt }).eq("id", data.user.id);
      if (data.session) await assignRole(data.user.id, "partner");
    }
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account. After confirming, you'll finish setting up your store.");
    navigate({ to: "/login" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field id="p-company" label="Company name" value={companyName} onChange={setCompanyName} autoComplete="organization" required />
      <Field id="p-reg" label="Registration number" value={regNumber} onChange={setRegNumber} required />
      <Field id="p-email" type="email" label={t.auth.email} value={email} onChange={setEmail} autoComplete="email" required />
      <Field id="p-phone" type="tel" label="Phone" value={phone} onChange={setPhone} autoComplete="tel" required />
      <Field id="p-password" type="password" label={t.auth.password} value={password} onChange={setPassword} autoComplete="new-password" minLength={8} required />
      <TermsCheckbox checked={accepted} onChange={setAccepted} />
      <Button type="submit" className="w-full" disabled={loading || !accepted}>{t.auth.signUp}</Button>
    </form>
  );
}

function Field({ id, label, value, onChange, type = "text", autoComplete, required, minLength }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} autoComplete={autoComplete} required={required} minLength={minLength}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-2 pt-1">
      <Checkbox id="terms" checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground cursor-pointer">
        {t.auth.agreePrefix}{" "}
        <Link to="/terms" target="_blank" className="text-primary font-medium hover:underline">{t.auth.agreeTerms}</Link>
        {" "}{t.auth.agreeAnd}{" "}
        <Link to="/privacy" target="_blank" className="text-primary font-medium hover:underline">{t.auth.agreePrivacy}</Link>
      </Label>
    </div>
  );
}
