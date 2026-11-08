import { useState } from "react";
import { Flag } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitDealReport } from "@/lib/trust.functions";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { useI18n } from "@/i18n/use-i18n";

const REASONS = [{ v: "spam" }, { v: "scam" }, { v: "expired" }, { v: "wrong_info" }, { v: "inappropriate" }, { v: "duplicate" }, { v: "other" }] as const;

export function ReportDealButton({ adId }: { adId: string }) {
  const { t } = useI18n();
  const r_ = t.homePages.report;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["v"]>("spam");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(submitDealReport);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submit({
        data: { adId, reason, note: note || undefined, fingerprint: getDeviceFingerprint() },
      });
      toast.success(res.duplicate ? r_.duplicate : r_.success);
      setOpen(false);
      setNote("");
    } catch (e: any) {
      toast.error(r_.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5 mr-1.5" />
        {r_.button}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{r_.button}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{r_.reason}</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r.v} value={r.v}>{r_.reasons[r.v]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{r_.note}</Label>
              <Textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={r_.placeholder} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>{r_.cancel}</Button>
            <Button onClick={onSubmit} disabled={submitting}>{submitting ? r_.submitting : r_.submit}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
