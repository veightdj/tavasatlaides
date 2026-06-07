import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { audienceForPath, buildAudienceUrl, getHostAudience } from "@/lib/audience";

/**
 * On recognised production hosts, redirect requests whose path belongs to a
 * different audience to the correct subdomain. No-op on preview/localhost.
 */
export function HostGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = getHostAudience();
    if (!host) return; // preview / localhost — no enforcement
    const need = audienceForPath(pathname);
    if (need === "shared" || need === host) return;
    const url = buildAudienceUrl(need, pathname, window.location.search, window.location.hash);
    window.location.replace(url);
  }, [pathname]);

  return null;
}
