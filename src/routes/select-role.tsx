import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// Friendly onboarding fallback for accounts that land without a resolved role.
// Today every signed-in user defaults to "client" inside profile-visibility, so
// this page is primarily a safety net (and a future home for explicit role pick).
export const Route = createFileRoute("/select-role")({
  head: () => ({
    meta: [
      { title: "Welcome — TavasAtlaides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SelectRolePage,
});

function SelectRolePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
      <h1 className="text-2xl font-bold">Welcome to TavasAtlaides 👋</h1>
      <p className="text-muted-foreground">
        Pick how you want to use the app. You can change this any time from your profile.
      </p>
      <div className="grid gap-3">
        <Button asChild size="lg"><Link to="/profile">I'm shopping for deals</Link></Button>
        <Button asChild size="lg" variant="outline"><Link to="/profile/store">I'm a business / partner</Link></Button>
      </div>
      <p className="text-xs text-muted-foreground">
        <Link to="/" className="underline">Back to home</Link>
      </p>
    </div>
  );
}
