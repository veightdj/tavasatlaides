import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Globe, LogOut, ShieldOff, Trash2, FileText, Cookie, Lock, Settings as SettingsIcon, Bell, ChevronRight,
} from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { deactivateAccount, deleteAccount } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, LANGS } from "@/i18n/use-i18n";
import { NotificationSettingsPanel } from "@/components/NotificationSettingsPanel";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Iestatījumi — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type TabKey = "notifications" | "general";

function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const deactivate = useServerFn(deactivateAccount);
  const del = useServerFn(deleteAccount);
  const [activeTab, setActiveTab] = useState<TabKey>("notifications");

  const [confirmText, setConfirmText] = useState("");
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDeactivate = async () => {
    setBusy(true);
    try {
      await deactivate();
      await supabase.auth.signOut();
      toast.success("Konts deaktivizēts. Tu esi izrakstīts no visām ierīcēm.");
      router.navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message || "Neizdevās deaktivizēt kontu");
    } finally {
      setBusy(false);
      setDeactivateOpen(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await del({ data: {} });
      await supabase.auth.signOut().catch(() => {});
      toast.success("Tavs konts ir neatgriezeniski dzēsts.");
      router.navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message || "Neizdevās dzēst kontu");
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-12 pb-24 md:pb-12 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.nav.settings}</h1>
        {user && (
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted/60 border">
        <TabButton active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} icon={Bell} label="Notifications" />
        <TabButton active={activeTab === "general"} onClick={() => setActiveTab("general")} icon={SettingsIcon} label="General" />
      </div>

      {activeTab === "notifications" && (
        <NotificationSettingsPanel />
      )}

      {activeTab === "general" && (
        <div className="space-y-8">
          {/* Language */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" /> Language
            </h2>
            <div className="rounded-2xl border bg-card p-2 grid grid-cols-3 gap-2">
              {LANGS.map((l) => (
                <Button
                  key={l.code}
                  variant={lang === l.code ? "default" : "ghost"}
                  className="min-h-11"
                  onClick={() => setLang(l.code)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </section>

          {/* Legal */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Legal
            </h2>
            <div className="rounded-2xl border bg-card divide-y">
              <LegalRow to="/privacy" icon={Lock} label={t.nav.privacy} />
              <LegalRow to="/terms" icon={FileText} label={t.nav.terms} />
              <LegalRow to="/cookie-policy" icon={Cookie} label={t.nav.cookies} />
            </div>
          </section>

          {/* Account (only when signed in) */}
          {!loading && user && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </h2>

              <div className="rounded-2xl border bg-card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <LogOut className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="flex-1 space-y-1 min-w-0">
                    <h3 className="font-semibold">Sign out</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign out of this device.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" className="w-full sm:w-auto min-h-11" onClick={signOut}>
                    {t.cta.signOut}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldOff className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="flex-1 space-y-1 min-w-0">
                    <h3 className="font-semibold">Deaktivizēt kontu</h3>
                    <p className="text-sm text-muted-foreground">
                      Īslaicīgi atslēdz kontu. Tevi izrakstīs no visām ierīcēm,
                      dati paliek saglabāti, un kontu varēs atjaunot, ielogojoties atkal.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" className="w-full sm:w-auto min-h-11" onClick={() => setDeactivateOpen(true)}>
                    Deaktivizēt
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Danger Zone (logged in only) */}
          {user && (
            <section aria-labelledby="danger-zone-heading" className="space-y-3">
              <div className="space-y-1">
                <h2
                  id="danger-zone-heading"
                  className="text-sm font-semibold uppercase tracking-wider text-destructive flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Bīstamā zona
                </h2>
              </div>

              <div className="rounded-2xl border-2 border-destructive/40 p-5 space-y-3 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 mt-1 shrink-0 text-destructive" aria-hidden="true" />
                  <div className="flex-1 space-y-1 min-w-0">
                    <h3 className="font-semibold text-destructive">Dzēst kontu neatgriezeniski</h3>
                    <p className="text-sm text-muted-foreground">
                      Visi tavi personas dati tiks pilnībā izdzēsti: profils,
                      saglabātie piedāvājumi, izlase, paziņojumi, augšupielādētie attēli,
                      aktivitātes vēsture un piekļuves konts. Šo darbību nevar atsaukt.
                    </p>
                    <p className="text-sm">
                      <Link to="/delete-account" className="underline underline-offset-2">
                        Sīkāk par konta dzēšanu
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto min-h-11"
                    onClick={() => { setConfirmText(""); setDeleteOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Dzēst kontu
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Deactivate confirm */}
          <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deaktivizēt kontu?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tevi izrakstīs no visām ierīcēm. Dati paliks saglabāti un kontu
                  varēsi atjaunot, ielogojoties no jauna.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Atcelt</AlertDialogCancel>
                <AlertDialogAction disabled={busy} onClick={onDeactivate}>
                  Deaktivizēt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete confirm */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Vai tiešām dzēst kontu uz visiem laikiem?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Šī darbība ir neatgriezeniska. Tiks dzēsti tavs profils,
                  saglabātie piedāvājumi, izlase, paziņojumi, augšupielādētie
                  attēli un visi personas dati no mūsu sistēmas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="confirm">
                  Lai apstiprinātu, ieraksti <strong>DZĒST</strong>:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DZĒST"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Atcelt</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy || confirmText.trim().toUpperCase() !== "DZĒST"}
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Dzēst neatgriezeniski
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Bell; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function LegalRow({ to, icon: Icon, label }: { to: string; icon: typeof FileText; label: string }) {
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
