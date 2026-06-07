import { isNativePlatform, nativePlatformName } from "./platform";

export type PushRegistration = {
  token: string;
  platform: "ios" | "android" | "web";
};

export class PushError extends Error {
  code: "permission_denied" | "unsupported" | "registration_failed";
  constructor(code: PushError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Initialise push notifications on native (Capacitor) and resolve with the
 * device token. On web we attempt a best-effort Notification permission
 * request and return null — real Web Push requires VAPID + a push service.
 */
export async function registerPush(opts?: {
  onForeground?: (notification: { title?: string; body?: string; data?: unknown }) => void;
}): Promise<PushRegistration | null> {
  if (!isNativePlatform()) {
    if (typeof window === "undefined" || !("Notification" in window)) {
      throw new PushError("unsupported", "Push notifications are not supported in this browser");
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      throw new PushError("permission_denied", "Notifications are blocked");
    }
    // No VAPID/FCM web-push wired here — return null to signal "web mode".
    return null;
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.checkPermissions();
  let state = perm.receive;
  if (state === "prompt" || state === "prompt-with-rationale") {
    state = (await PushNotifications.requestPermissions()).receive;
  }
  if (state !== "granted") {
    throw new PushError("permission_denied", "Push permission denied");
  }

  // Wire listeners once per session
  const reg = new Promise<PushRegistration>((resolve, reject) => {
    const onReg = PushNotifications.addListener("registration", (t) => {
      onReg.then((h) => h.remove()).catch(() => {});
      onErr.then((h) => h.remove()).catch(() => {});
      resolve({ token: t.value, platform: nativePlatformName() as "ios" | "android" });
    });
    const onErr = PushNotifications.addListener("registrationError", (e) => {
      onReg.then((h) => h.remove()).catch(() => {});
      onErr.then((h) => h.remove()).catch(() => {});
      reject(new PushError("registration_failed", String(e?.error ?? "Registration failed")));
    });
  });

  if (opts?.onForeground) {
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      opts.onForeground?.({ title: n.title, body: n.body, data: n.data });
    }).catch(() => {});
  }

  await PushNotifications.register();
  return reg;
}
