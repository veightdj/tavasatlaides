// Server-only helper for sending OneSignal pushes from server routes / fns.
// Do NOT import from client code.

const ONESIGNAL_APP_ID =
  process.env.VITE_ONESIGNAL_APP_ID ?? "60ddea51-e254-4626-bfb2-888c3ec55efe";
const ONESIGNAL_API = "https://api.onesignal.com/notifications";

export type OneSignalPayload = {
  title: string;
  message: string;
  url?: string;
  externalUserIds?: string[];
  playerIds?: string[];
  data?: Record<string, unknown>;
};

export async function sendOneSignal(payload: OneSignalPayload) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY not configured");

  const body: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: payload.title },
    contents: { en: payload.message },
  };
  if (payload.url) body.url = payload.url;
  if (payload.data) body.data = payload.data;
  if (payload.externalUserIds?.length) {
    body.include_aliases = { external_id: payload.externalUserIds };
    body.target_channel = "push";
  }
  if (payload.playerIds?.length) {
    body.include_subscription_ids = payload.playerIds;
  }

  const res = await fetch(ONESIGNAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`OneSignal ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}
