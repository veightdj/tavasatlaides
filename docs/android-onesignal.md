# Android (Native) OneSignal Integration

The TavasAtlaides web app uses **OneSignal Web Push** out of the box. If you wrap the app in a native Android shell (Capacitor, React Native, or pure native), follow these steps so location-based push notifications continue to work without any backend changes.

The backend already does all the targeting work:
- The Postgres trigger `trg_notify_new_deal` fires when a new active deal is inserted.
- `POST /api/public/hooks/notify-deal` computes haversine distance against every user's `notification_preferences.latitude`/`longitude` and decides whether to push instantly or queue for a daily summary.
- `POST /api/public/hooks/notify-digest` (cron at 10:00 / 14:00 / 18:00 UTC) flushes the queue into one summary push.

The native app's only jobs are:
1. Register the device with OneSignal.
2. Link the OneSignal **External User ID** to the Supabase user UUID (so backend targeting by `include_aliases.external_id` resolves to this device).
3. Periodically push the user's current coordinates to `notification_preferences`.

---

## 1. Add the OneSignal Android SDK

`app/build.gradle`:

```gradle
dependencies {
    implementation 'com.onesignal:OneSignal:[5.1.0, 5.99.99]'
}
```

`AndroidManifest.xml` — no extra permissions needed for push; `ACCESS_FINE_LOCATION` is only required if you want native background geolocation:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```

## 2. Initialize in `Application.onCreate`

```kotlin
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        OneSignal.Debug.logLevel = LogLevel.VERBOSE
        OneSignal.initWithContext(this, "60ddea51-e254-4626-bfb2-888c3ec55efe")

        // Ask for permission at the right moment in the UX (not in onCreate in production).
        CoroutineScope(Dispatchers.IO).launch {
            OneSignal.Notifications.requestPermission(true)
        }
    }
}
```

## 3. Link the OneSignal External User ID to the Supabase user

After Supabase sign-in completes, call:

```kotlin
OneSignal.login(supabaseUserId)  // supabaseUserId == auth.users.id
```

On sign-out:

```kotlin
OneSignal.logout()
```

The web app already does the equivalent in `src/components/PushNotificationToggle.tsx` via `react-onesignal`.

## 4. Push the user's location to `notification_preferences`

Whenever you get a fresh `Location` (foreground service, fused location provider, or simply when the user opens the app), upsert to the backend:

```kotlin
// Either call the existing TanStack server fn via fetch, or use Supabase Android SDK:
supabaseClient.from("notification_preferences").upsert(
    mapOf(
        "user_id" to userId,
        "latitude" to location.latitude,
        "longitude" to location.longitude,
        "updated_at" to Clock.System.now().toString()
    )
)
```

If you want minute-by-minute geofencing, run a foreground service with `FusedLocationProviderClient` and upsert only when the user has moved > 100 m. Backend deduplication (`pending_deal_notifications.UNIQUE(user_id, ad_id)`) ensures each deal results in at most one push per user per slot.

## 5. Handle taps on notifications

The backend sends `data: { ad_id, kind }`. Open the relevant route:

```kotlin
OneSignal.Notifications.addClickListener { event ->
    val adId = event.notification.additionalData?.optString("ad_id")
    val kind = event.notification.additionalData?.optString("kind") // "new_deal" | "daily_summary"
    val intent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse(
            if (kind == "daily_summary") "https://tavasatlaides.lovable.app/deals"
            else "https://tavasatlaides.lovable.app/deals/$adId"
        )
    }
    startActivity(intent)
}
```

## 6. Example payloads the device will receive

**Instant push (single new deal):**

```json
{
  "app_id": "60ddea51-e254-4626-bfb2-888c3ec55efe",
  "headings": { "en": "New deal: 20% off espresso" },
  "contents": { "en": "Black Cat Coffee – tap to see the offer" },
  "url": "https://tavasatlaides.lovable.app/deals/2a0d…",
  "include_aliases": { "external_id": ["<supabase-user-uuid>"] },
  "target_channel": "push",
  "data": { "ad_id": "2a0d…", "kind": "new_deal" }
}
```

**Daily summary push:**

```json
{
  "app_id": "60ddea51-e254-4626-bfb2-888c3ec55efe",
  "headings": { "en": "5 new deals near you" },
  "contents": { "en": "Tap to browse 5 fresh deals in your area." },
  "url": "https://tavasatlaides.lovable.app/deals",
  "include_aliases": { "external_id": ["<supabase-user-uuid>"] },
  "target_channel": "push",
  "data": { "ad_id": null, "kind": "daily_summary", "count": 5, "ad_ids": ["…","…"] }
}
```

## 7. If geolocation is unavailable

Mirror the web app's behavior:
- Show "Couldn't determine your location. Allow location access in your browser/device settings, or enter an address manually."
- Re-use the last saved `notification_preferences.latitude` / `longitude` for distance filtering so the user still gets relevant pushes.
- Surface a "Choose address manually" affordance.

---

That's the entire integration — the rest (radius, frequency, quiet hours, daily summary aggregation) is enforced server-side and applies identically to web and Android devices.
