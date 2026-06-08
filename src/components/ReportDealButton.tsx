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

const REASONS = [
  { v: "spam", l: "Spam" },
  { v: "scam", l: "Scam / misleading" },
  { v: "expired", l: "Expired / not honoured" },
  { v: "wrong_info", l: "Wrong information" },
  { v: "inappropriate", l: "Inappropriate content" },
  { v: "duplicate", l: "Duplicate" },
  { v: "other", l: "Other" },
] as const;

export function ReportDealButton({ adId }: { adId: string }) {
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
      toast.success(res.duplicate ? "Already reported — thanks." : "Report submitted. Thanks for helping.");
      setOpen(false);
      setNote("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5 mr-1.5" />
        Report this deal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Report this deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="What's wrong?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={onSubmit} disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
