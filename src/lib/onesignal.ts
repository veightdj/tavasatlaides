import { isNativePlatform, nativePlatformName } from "./platform";

export const ONESIGNAL_APP_ID =
  (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined) ??
  "60ddea51-e254-4626-bfb2-888c3ec55efe";

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

type OneSignalSdk = {
  initialize?: (appId: string) => void;
  init?: (options: Record<string, unknown>) => Promise<void>;
  login?: (externalId: string) => Promise<void> | void;
  logout?: () => Promise<void> | void;
  Slidedown?: { promptPush?: () => Promise<void> | void };
  Notifications?: {
    requestPermission?: (
      fallbackToSettings?: boolean,
      callback?: (granted: boolean) => void,
    ) => Promise<boolean | void> | void;
  };
  User?: {
    pushSubscription?: { id?: string | null };
    PushSubscription?: { id?: string | null; optIn?: () => Promise<void> | void };
  };
};

type OneSignalModule = OneSignalSdk & { default?: OneSignalSdk };

async function initWeb() {
  if (typeof window === "undefined") throw new OneSignalError("unsupported", "No window");
  if (!webInitPromise) {
    webInitPromise = (async () => {
      const OneSignal = (await import("react-onesignal")).default;
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: "web.onesignal.auto.12f40fc9-13d7-4ca9-8e4a-0a7d50f473bf",
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        notifyButton: { enable: true, prenotify: true, showCredit: false, text: {} as never },
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
  const mod = (await import("onesignal-cordova-plugin")) as OneSignalModule;
  const OneSignal = mod.default ?? mod;
  OneSignal.initialize?.(ONESIGNAL_APP_ID);
  nativeInitDone = true;
}

/**
 * Register the device with OneSignal and return its player (subscription) ID.
 * Works on Capacitor native (iOS/Android) and web browsers.
 */
export async function registerOneSignal(): Promise<OneSignalRegistration> {
  if (isNativePlatform()) {
    await initNative();
    const mod = (await import("onesignal-cordova-plugin")) as OneSignalModule;
    const OneSignal = mod.default ?? mod;

    const accepted: boolean = await new Promise((resolve) => {
      try {
        OneSignal.Notifications?.requestPermission?.(true, (granted: boolean) => resolve(granted));
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
  const OneSignal = (await import("react-onesignal")).default as unknown as OneSignalSdk;

  // Show the OneSignal slidedown / native prompt
  try {
    await OneSignal.Slidedown?.promptPush?.();
  } catch {
    /* ignore — fallback to opt-in below */
  }
  try {
    await OneSignal.Notifications?.requestPermission?.();
  } catch {
    /* ignore */
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
      const mod = (await import("onesignal-cordova-plugin")) as OneSignalModule;
      const OneSignal = mod.default ?? mod;
      OneSignal.login?.(externalId);
      return;
    }
    await initWeb();
    const OneSignal = (await import("react-onesignal")).default as unknown as OneSignalSdk;
    await OneSignal.login?.(externalId);
  } catch {
    /* non-blocking */
  }
}

/** Detect the current platform string used for OneSignal tag targeting. */
export function oneSignalPlatformTag(): "web" | "ios" | "android" {
  if (isNativePlatform()) return nativePlatformName() as "ios" | "android";
  return "web";
}

type AddTagsSdk = {
  User?: { addTags?: (tags: Record<string, string>) => Promise<void> | void };
};

/** Send a flat string→string tag map to OneSignal (best-effort, non-throwing). */
export async function setOneSignalTags(tags: Record<string, string>) {
  const enriched = { platform: oneSignalPlatformTag(), ...tags };
  try {
    if (isNativePlatform()) {
      const mod = (await import("onesignal-cordova-plugin")) as OneSignalModule & AddTagsSdk;
      const OneSignal = (mod.default ?? mod) as AddTagsSdk;
      await OneSignal.User?.addTags?.(enriched);
      return;
    }
    if (typeof window === "undefined") return;
    await initWeb();
    const OneSignal = (await import("react-onesignal")).default as unknown as AddTagsSdk;
    await OneSignal.User?.addTags?.(enriched);
  } catch (e) {
    console.warn("[onesignal] setOneSignalTags failed", e);
  }
}



/** Unbind the OneSignal user from this device (called on sign-out). */
export async function logoutOneSignal() {
  try {
    if (isNativePlatform()) {
      const mod = (await import("onesignal-cordova-plugin")) as OneSignalModule;
      const OneSignal = mod.default ?? mod;
      OneSignal.logout?.();
      return;
    }
    if (typeof window === "undefined") return;
    const OneSignal = (await import("react-onesignal")).default as unknown as OneSignalSdk;
    await OneSignal.logout?.();
  } catch {
    /* non-blocking */
  }
}
