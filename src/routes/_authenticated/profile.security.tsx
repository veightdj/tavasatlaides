import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength, scorePassword } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/_authenticated/profile/security")({
  head: () => ({
    meta: [
      { title: "Security — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return toast.error("You must be signed in.");
    if (next !== confirm) return toast.error("New passwords do not match.");
    if (next === current) return toast.error("New password must differ from the current one.");
    if (scorePassword(next).score < 3) return toast.error("Please choose a stronger password.");
    setLoading(true);
    // Reauthenticate by re-signing-in with the current password before the
    // privileged updateUser({password}) call.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (signInErr) {
      setLoading(false);
      return toast.error("Current password is incorrect.");
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated successfully.");
    setCurrent(""); setNext(""); setConfirm("");
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to profile
      </Link>
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <KeyRound className="h-6 w-6 text-primary" /> Security
        </h1>
        <p className="text-sm text-muted-foreground">Change your password to keep your account secure.</p>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" autoComplete="current-password" required
            value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required
            value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordStrength password={next} />
          <p className="text-xs text-muted-foreground">Use at least 8 characters, mixed case, a number and a symbol.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
