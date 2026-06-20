import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { logImpersonation } from "@/lib/admin-businesses.functions";

type Impersonation = {
  store_id: string;
  owner_id: string;
  store_name: string;
  started_at: number;
};

const KEY = "admin_impersonation";

export function getImpersonation(): Impersonation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Impersonation) : null;
  } catch {
    return null;
  }
}

export function setImpersonation(v: Impersonation | null) {
  if (typeof window === "undefined") return;
  if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("admin_impersonation_changed"));
}

export function ImpersonationBanner() {
  const [imp, setImp] = useState<Impersonation | null>(null);

  useEffect(() => {
    const sync = () => setImp(getImpersonation());
    sync();
    window.addEventListener("admin_impersonation_changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("admin_impersonation_changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!imp) return null;

  const stop = async () => {
    try {
      await logImpersonation({ data: { store_id: imp.store_id, event: "stop" } });
    } catch {
      /* ignore */
    }
    setImpersonation(null);
    window.location.href = "/admin/businesses";
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-3 text-sm">
        <span className="font-semibold">Admin impersonation:</span>
        <span className="truncate">Viewing as partner <strong>{imp.store_name}</strong></span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="bg-white/90 hover:bg-white text-amber-950 border-amber-600"
          onClick={stop}
        >
          Exit impersonation
        </Button>
      </div>
    </div>
  );
}
