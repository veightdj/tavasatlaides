import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldOff, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Iestatījumi — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const deactivate = useServerFn(deactivateAccount);
  const del = useServerFn(deleteAccount);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12 pb-24 md:pb-12 space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Iestatījumi</h1>
        <p className="text-muted-foreground">Pārvaldi savu kontu un privātumu.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Privātums un konts</h2>

        {/* Deactivate */}
        <div className="rounded-2xl border p-5 space-y-3 bg-card">
          <div className="flex items-start gap-3">
            <ShieldOff className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">Deaktivizēt kontu</h3>
              <p className="text-sm text-muted-foreground">
                Īslaicīgi atslēdz kontu. Tevi izrakstīs no visām ierīcēm,
                statuss kļūs <strong>inactive</strong>, dati paliek saglabāti.
                Konts tiek atjaunots, kad ielogojies atkal vai sazinies ar atbalstu.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDeactivateOpen(true)}>
              Deaktivizēt
            </Button>
          </div>
        </div>

        {/* Delete (red) */}
        <div className="rounded-2xl border border-destructive/40 p-5 space-y-3 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-1 shrink-0 text-destructive" />
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-destructive">Dzēst kontu neatgriezeniski</h3>
              <p className="text-sm text-muted-foreground">
                Visi tavi personas dati tiks pilnībā izdzēsti: profils,
                saglabātie piedāvājumi, izlase, paziņojumi, augšupielādētie attēli,
                aktivitātes vēsture un piekļuves konts. Šo darbību nevar atsaukt.
              </p>
              <p className="text-sm">
                <Link to="/delete-account" className="underline">
                  Sīkāk par konta dzēšanu
                </Link>
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => { setConfirmText(""); setDeleteOpen(true); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Dzēst kontu
            </Button>
          </div>
        </div>
      </section>

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
  );
}
