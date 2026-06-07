import { isNativePlatform, nativePlatformName } from "./platform";

export const ONESIGNAL_APP_ID = "60ddea51-e254-4626-bfb2-888c3ec55efe";

let webInitPromise: Promise<void> | null = null;
let nativeInitDone = false;

export class OneSignalError extends Error {
  code: "permission_denied" | "unsupported" | "init_failed";
  constructor(code: OneSignalError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export type OneSignalRegistration = {
  playerId: string;
  platform: "ios" | "android" | "web";
};

async function initWeb() {
  if (typeof window === "undefined") throw new OneSignalError("unsupported", "No window");
  if (!webInitPromise) {
    webInitPromise = (async () => {
      const OneSignal = (await import("react-onesignal")).default;
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "OneSignalSDKWorker.js",
      });
    })().catch((e) => {
      webInitPromise = null;
      throw new OneSignalError("init_failed", String((e as Error)?.message ?? e));
    });
  }
  return webInitPromise;
}

async function initNative() {
  if (nativeInitDone) return;
  const mod: any = await import("onesignal-cordova-plugin");
  const OneSignal = mod.default ?? mod;
  OneSignal.initialize(ONESIGNAL_APP_ID);
  nativeInitDone = true;
}

/**
 * Register the device with OneSignal and return its player (subscription) ID.
 * Works on Capacitor native (iOS/Android) and web browsers.
 */
export async function registerOneSignal(): Promise<OneSignalRegistration> {
  if (isNativePlatform()) {
    await initNative();
    const mod: any = await import("onesignal-cordova-plugin");
    const OneSignal = mod.default ?? mod;

    const accepted: boolean = await new Promise((resolve) => {
      try {
        OneSignal.Notifications.requestPermission(true, (granted: boolean) => resolve(granted));
      } catch {
        resolve(false);
      }
    });
    if (!accepted) throw new OneSignalError("permission_denied", "Notifications denied");

    // Poll for subscription id (the SDK populates it shortly after permission)
    const start = Date.now();
    while (Date.now() - start < 10_000) {
      const id: string | null | undefined = OneSignal.User?.pushSubscription?.id;
      if (id) return { playerId: id, platform: nativePlatformName() as "ios" | "android" };
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new OneSignalError("init_failed", "Could not obtain OneSignal subscription id");
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new OneSignalError("unsupported", "Push not supported in this browser");
  }

  await initWeb();
  const OneSignal = (await import("react-onesignal")).default as any;

  // Show the OneSignal slidedown / native prompt
  try {
    await OneSignal.Slidedown?.promptPush?.();
  } catch {
    /* ignore — fallback to opt-in below */
  }
  try {
    await OneSignal.User?.PushSubscription?.optIn?.();
  } catch {
    /* ignore */
  }

  // Wait for subscription id
  const start = Date.now();
  while (Date.now() - start < 10_000) {
    const id: string | null | undefined = OneSignal.User?.PushSubscription?.id;
    if (id) return { playerId: id, platform: "web" };
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new OneSignalError("permission_denied", "Notifications were not enabled");
}

/** Link the OneSignal user to your app user id (so server-send can target by external id). */
export async function setOneSignalExternalId(externalId: string) {
  try {
    if (isNativePlatform()) {
      const mod: any = await import("onesignal-cordova-plugin");
      const OneSignal = mod.default ?? mod;
      OneSignal.login(externalId);
      return;
    }
    await initWeb();
    const OneSignal = (await import("react-onesignal")).default as any;
    await OneSignal.login?.(externalId);
  } catch {
    /* non-blocking */
  }
}
