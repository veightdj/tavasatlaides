import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — TavasAtlaides" },
      { name: "description", content: "Request a secure password reset link for your TavasAtlaides account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Always show the same neutral confirmation to avoid disclosing whether
    // an account exists (user enumeration protection).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthShell title="Forgot your password?">
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, a password reset link has been sent. Please check your inbox and spam folder. The link expires after 1 hour.
          </p>
          <Button asChild variant="outline" className="w-full"><Link to="/login">Back to sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the email address for your account and we'll send you a secure link to set a new password.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            <Link to="/login" className="text-primary font-medium hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
