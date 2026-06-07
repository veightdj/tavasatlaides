import { createFileRoute, Link } from "@tanstack/react-router";
import { NotificationSettingsPanel } from "@/components/NotificationSettingsPanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification settings — TavasAtlaides" },
      { name: "description", content: "Choose which nearby deals you want to be notified about, and how often." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationSettings,
});

function NotificationSettings() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12 pb-24 md:pb-12">
      <NotificationSettingsPanel />
      <div className="pt-4 border-t mt-8">
        <Button asChild className="w-full sm:w-auto">
          <Link to="/nearby">Open Deals Near Me</Link>
        </Button>
      </div>
    </div>
  );
}
