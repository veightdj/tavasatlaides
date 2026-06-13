import { useState } from "react";
import { useRouter, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { deactivateAccount, deleteAccount } from "@/lib/account.functions";


export function AccountActionsSection() {
  const router = useRouter();
  const qc = useQueryClient();
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
      toast.success("Konts deaktivizēts.");
      router.navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message || "Neizdevās deaktivizēt kontu");
    } finally { setBusy(false); setDeactivateOpen(false); }
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
    } finally { setBusy(false); setDeleteOpen(false); }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full min-h-11" onClick={onLogout}>Iziet</Button>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="danger-zone" className="border-0 rounded-2xl border overflow-hidden">
          <AccordionTrigger className="px-5 py-4 text-base font-semibold bg-muted/40 hover:no-underline hover:bg-muted/60">
            Bīstamās darbības
          </AccordionTrigger>
          <AccordionContent className="p-5 space-y-4 bg-card">
            <div className="flex items-start gap-3">
              <ShieldOff className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1 space-y-1 min-w-0">
                <h3 className="font-semibold">Deaktivizēt kontu</h3>
                <p className="text-sm text-muted-foreground">
                  Īslaicīgi atslēdz kontu. Dati paliek saglabāti un atjaunojas, kad ielogojies atkal.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" className="min-h-11" onClick={() => setDeactivateOpen(true)}>Deaktivizēt</Button>
            </div>

            <div className="rounded-2xl border-2 border-destructive/40 p-5 space-y-3 bg-destructive/5">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 mt-1 shrink-0 text-destructive" aria-hidden="true" />
                <div className="flex-1 space-y-1 min-w-0">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />Dzēst kontu
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Visi tavi personas dati tiks pilnībā izdzēsti. Šo darbību nevar atsaukt.
                  </p>
                  <p className="text-sm">
                    <Link to="/delete-account" className="underline underline-offset-2">Sīkāk par konta dzēšanu</Link>
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="destructive" className="min-h-11" onClick={() => { setConfirmText(""); setDeleteOpen(true); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Dzēst kontu
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktivizēt kontu?</AlertDialogTitle>
            <AlertDialogDescription>Tevi izrakstīs no visām ierīcēm. Dati paliks saglabāti.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Atcelt</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={onDeactivate}>Deaktivizēt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Vai tiešām dzēst kontu uz visiem laikiem?</AlertDialogTitle>
            <AlertDialogDescription>Šī darbība ir neatgriezeniska.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm">Lai apstiprinātu, ieraksti <strong>DZĒST</strong>:</Label>
            <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DZĒST" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Atcelt</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || confirmText.trim().toUpperCase() !== "DZĒST"}
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Dzēst neatgriezeniski</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
