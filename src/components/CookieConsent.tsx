import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent, type ConsentChoice } from "@/lib/consent";

export type CookieChoice = ConsentChoice;
export const getCookieConsent = getConsent;

const copy = {
  lv: {
    title: "Mēs izmantojam sīkdatnes",
    body: "Mēs izmantojam sīkdatnes, lai uzlabotu Jūsu pieredzi, analizētu lietojumu un personalizētu saturu. Vairāk lasiet mūsu",
    link: "sīkdatņu politikā",
    accept: "Pieņemt visas",
    reject: "Tikai nepieciešamās",
  },
  en: {
    title: "We use cookies",
    body: "We use cookies to improve your experience, analyze usage and personalize content. Read more in our",
    link: "cookie policy",
    accept: "Accept all",
    reject: "Only necessary",
  },
  ru: {
    title: "Мы используем cookies",
    body: "Мы используем cookies для улучшения работы, анализа и персонализации. Подробнее в нашей",
    link: "политике cookies",
    accept: "Принять все",
    reject: "Только необходимые",
  },
} as const;

export function CookieConsent() {
  const { lang } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const c = copy[lang] ?? copy.lv;

  const choose = (choice: CookieChoice) => {
    try {
      setConsent(choice);
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={c.title}
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">{c.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {c.body}{" "}
          <Link to="/cookie-policy" className="underline underline-offset-2 hover:text-foreground">
            {c.link}
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => choose("rejected")}>
            {c.reject}
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            {c.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
