import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { PasswordStrength, scorePassword } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Supabase's reset link sets a recovery session in the URL hash. We wait for
  // onAuthStateChange to confirm it before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setValid(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValid(true);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (scorePassword(password).score < 3) return toast.error("Please choose a stronger password");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/profile" });
  };

  if (!ready) {
    return <AuthShell title="Reset password"><p className="text-sm text-muted-foreground text-center">Loading…</p></AuthShell>;
  }

  if (!valid) {
    return (
      <AuthShell title="Reset link is invalid or expired">
        <p className="text-sm text-muted-foreground text-center">
          Please request a new password reset link.
        </p>
        <Button asChild className="w-full"><a href="/forgot-password">Request new link</a></Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
