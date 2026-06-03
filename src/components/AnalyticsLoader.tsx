import { useEffect } from "react";
import { loadIfConsented } from "@/lib/consent";

/**
 * Mount-anywhere component that loads analytics/ads scripts ONLY after
 * the user has accepted cookies. Reads optional measurement IDs from
 * Vite env vars; if a var is missing, that script is simply skipped.
 *
 * Supported (all optional):
 *   VITE_GA_MEASUREMENT_ID  – Google Analytics 4 (gtag.js)
 *   VITE_GTM_ID             – Google Tag Manager
 *   VITE_ADSENSE_CLIENT_ID  – Google AdSense (ca-pub-XXXXX)
 */
export function AnalyticsLoader() {
  useEffect(() => {
    return loadIfConsented(() => {
      const cleanups: Array<() => void> = [];
      const env = import.meta.env;

      const gaId = env.VITE_GA_MEASUREMENT_ID as string | undefined;
      if (gaId) {
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        s.dataset.consent = "analytics";
        document.head.appendChild(s);
        const inline = document.createElement("script");
        inline.dataset.consent = "analytics";
        inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`;
        document.head.appendChild(inline);
        cleanups.push(() => {
          s.remove();
          inline.remove();
        });
      }

      const gtmId = env.VITE_GTM_ID as string | undefined;
      if (gtmId) {
        const s = document.createElement("script");
        s.async = true;
        s.dataset.consent = "analytics";
        s.text = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
        document.head.appendChild(s);
        cleanups.push(() => s.remove());
      }

      const adsId = env.VITE_ADSENSE_CLIENT_ID as string | undefined;
      if (adsId) {
        const s = document.createElement("script");
        s.async = true;
        s.crossOrigin = "anonymous";
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsId}`;
        s.dataset.consent = "ads";
        document.head.appendChild(s);
        cleanups.push(() => s.remove());
      }

      return () => cleanups.forEach((c) => c());
    });
  }, []);

  return null;
}
