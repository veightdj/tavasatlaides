import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/billing")({
  head: () => ({ meta: [{ title: "Billing — TavasAtlaides" }, { name: "robots", content: "noindex" }] }),
  component: Billing,
});

function Billing() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-muted-foreground"><Link to="/profile" className="underline">Profile</Link> / Billing</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Subscription &amp; billing</h1>
      </header>
      <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
        <CreditCard className="h-10 w-10 mx-auto text-primary" />
        <p className="mt-3 text-sm">Subscription &amp; billing coming soon.</p>
      </div>
    </div>
  );
}
