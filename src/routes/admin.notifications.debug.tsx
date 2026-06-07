import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  ONESIGNAL_APP_ID,
  registerOneSignal,
  setOneSignalExternalId,
} from "@/lib/onesignal";
import { isNativePlatform, nativePlatformName } from "@/lib/platform";
import { sendOneSignalNotification } from "@/lib/onesignal.functions";
import { saveOneSignalSubscription } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/admin/notifications/debug")({
  head: () => ({
    meta: [{ title: "Notification Debug — Admin" }],
  }),
  component: DebugPage,
});

type LastNotif = {
  title?: string;
  body?: string;
  receivedAt: string;
  raw: unknown;
};

function DebugPage() {
  const { user } = useAuth();
  const [subId, setSubId] = useState<string | null>(null);
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>("unknown");
  const [gps, setGps] = useState<string>("unknown");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [last, setLast] = useState<LastNotif | null>(null);
  const [busy, setBusy] = useState(false);

  const sendTest = useServerFn(sendOneSignalNotification);
  const saveSub = useServerFn(saveOneSignalSubscription);

  // Poll OneSignal state
  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        if (typeof window === "undefined") return;
        if (typeof Notification !== "undefined") setPermission(Notification.permission);

        if (!isNativePlatform()) {
          const OneSignal = (await import("react-onesignal")).default as any;
          const tick = () => {
            if (!alive) return;
            setSubId(OneSignal.User?.PushSubscription?.id ?? null);
            setOptedIn(OneSignal.User?.PushSubscription?.optedIn ?? null);
            setExternalId(OneSignal.User?.externalId ?? null);
          };
          tick();
          const interval = setInterval(tick, 1500);
          try {
            const handler = (e: any) => {
              setLast({
                title: e?.notification?.title,
                body: e?.notification?.body,
                receivedAt: new Date().toISOString(),
                raw: e?.notification ?? e,
              });
            };
            OneSignal.Notifications?.addEventListener?.("foregroundWillDisplay", handler);
            unsub = () => {
              clearInterval(interval);
              OneSignal.Notifications?.removeEventListener?.("foregroundWillDisplay", handler);
            };
          } catch {
            unsub = () => clearInterval(interval);
          }
        } else {
          const mod: any = await import("onesignal-cordova-plugin");
          const OneSignal = mod.default ?? mod;
          const tick = () => {
            if (!alive) return;
            setSubId(OneSignal.User?.pushSubscription?.id ?? null);
            setOptedIn(OneSignal.User?.pushSubscription?.optedIn ?? null);
          };
          tick();
          const interval = setInterval(tick, 1500);
          unsub = () => clearInterval(interval);
        }
      } catch (e) {
        console.error("[debug] onesignal probe failed", e);
      }
    })();

    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  // GPS
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps("unsupported");
      return;
    }
    if ((navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: "geolocation" })
        .then((p: any) => {
          setGps(p.state);
          p.onchange = () => setGps(p.state);
        })
        .catch(() => setGps("unknown"));
    }
  }, []);

  const probeGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGps("granted");
      },
      (err) => {
        toast.error("GPS error", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const enableAndLink = async () => {
    setBusy(true);
    try {
      const reg = await registerOneSignal();
      if (user) {
        await setOneSignalExternalId(user.id);
        await saveSub({
          data: { onesignalSubscriptionId: reg.playerId, platform: reg.platform },
        });
      }
      toast.success("Registered", { description: reg.playerId });
    } catch (e: any) {
      toast.error("Register failed", { description: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  const sendToMe = async () => {
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    setBusy(true);
    try {
      const res = await sendTest({
        data: {
          title: "Debug test",
          message: `Hello from debug · ${new Date().toLocaleTimeString()}`,
          externalUserIds: [user.id],
        },
      });
      toast.success("Sent", { description: `id: ${res.id ?? "—"}` });
    } catch (e: any) {
      toast.error("Send failed", { description: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  const initialized = subId !== null || optedIn !== null;

  return (
    <AdminShell title="Notification Debug">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OneSignal status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="App ID" value={ONESIGNAL_APP_ID} mono />
            <Row label="Platform" value={isNativePlatform() ? nativePlatformName() : "web"} />
            <Row
              label="SDK initialized"
              value={<StatusBadge ok={initialized} okLabel="yes" badLabel="no" />}
            />
            <Row
              label="Opted in"
              value={
                <StatusBadge
                  ok={optedIn === true}
                  okLabel="yes"
                  badLabel={optedIn === false ? "no" : "unknown"}
                />
              }
            />
            <Row label="Subscription ID" value={subId ?? "—"} mono copy />
            <Row label="External ID" value={externalId ?? "—"} mono copy />
            <Row label="Permission" value={permission} />
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={enableAndLink} disabled={busy}>
                Enable & link
              </Button>
              <Button size="sm" variant="secondary" onClick={sendToMe} disabled={busy || !user}>
                Send test to me
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">User & location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="User ID" value={user?.id ?? "—"} mono copy />
            <Row label="Email" value={user?.email ?? "—"} />
            <Row label="GPS permission" value={gps} />
            <Row
              label="Coords"
              value={coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "—"}
              mono
            />
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={probeGps}>
                Get current location
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Last received notification</CardTitle>
          </CardHeader>
          <CardContent>
            {last ? (
              <div className="space-y-2 text-sm">
                <Row label="Title" value={last.title ?? "—"} />
                <Row label="Body" value={last.body ?? "—"} />
                <Row label="Received" value={new Date(last.receivedAt).toLocaleString()} />
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-60">
                  {JSON.stringify(last.raw, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No foreground notifications captured yet. Background notifications are delivered by
                the OS and won't appear here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Native Android requires <code>npx cap sync android</code> + Firebase setup.</p>
            <p>• iOS PWA pushes require the user to install the site to the home screen first.</p>
            <p>• Foreground listener only fires while this tab is focused.</p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function Row({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copy?: boolean;
}) {
  const text = typeof value === "string" ? value : null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-36 shrink-0 text-muted-foreground">{label}</div>
      <div className={`flex-1 min-w-0 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
      {copy && text && text !== "—" && (
        <button
          type="button"
          className="text-xs text-primary hover:underline shrink-0"
          onClick={() => {
            navigator.clipboard?.writeText(text);
            toast.success("Copied");
          }}
        >
          copy
        </button>
      )}
    </div>
  );
}

function StatusBadge({
  ok,
  okLabel,
  badLabel,
}: {
  ok: boolean;
  okLabel: string;
  badLabel: string;
}) {
  return (
    <Badge variant={ok ? "default" : "secondary"}>{ok ? okLabel : badLabel}</Badge>
  );
}
