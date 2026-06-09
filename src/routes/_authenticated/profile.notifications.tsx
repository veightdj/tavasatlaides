import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TavasAtlaides" }, { name: "robots", content: "noindex" }] }),
  component: Inbox_,
});

function Inbox_() {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: ["notif-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_history")
        .select("id,title,body,sent_at,kind")
        .eq("user_id", user!.id)
        .order("sent_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-muted-foreground"><Link to="/profile" className="underline">Profile</Link> / Notifications</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Notification center</h1>
      </header>

      {!items?.length ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto text-primary" />
          <p className="mt-3 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n: any) => (
            <li key={n.id} className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">{n.title ?? "Notification"}</p>
              {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
              <p className="text-[11px] text-muted-foreground mt-2">{new Date(n.sent_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
