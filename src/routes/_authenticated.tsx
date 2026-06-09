import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";
import { audienceForPath, buildAudienceUrl, getHostAudience } from "@/lib/audience";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const currentHost = getHostAudience();
    const pathAudience = audienceForPath(window.location.pathname);
    if (currentHost && pathAudience !== "shared" && pathAudience !== currentHost) {
      window.location.replace(
        buildAudienceUrl(pathAudience, window.location.pathname + window.location.search + window.location.hash),
      );
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setAuthed(!!session);
      setChecking(false);
      if (!session) {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (checking) return <div className="p-10 text-center text-muted-foreground">{t.common.loading}</div>;
  if (!authed) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-8">
      <Outlet />
    </div>
  );
}
