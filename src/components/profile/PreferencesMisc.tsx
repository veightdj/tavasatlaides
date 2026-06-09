import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n, LANGS } from "@/i18n/use-i18n";

type Theme = "light" | "dark" | "system";
const THEME_KEY = "app:theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function PreferencesMisc() {
  const { lang, setLang } = useI18n();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && (localStorage.getItem(THEME_KEY) as Theme)) || "system";
    setTheme(stored); applyTheme(stored);
  }, []);

  const onTheme = (t: Theme) => {
    setTheme(t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    applyTheme(t);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-base">Language</Label>
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <Button key={l.code} size="sm" variant={lang === l.code ? "default" : "outline"} onClick={() => setLang(l.code)}>
              {l.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Theme</Label>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as Theme[]).map((t) => (
            <Button key={t} size="sm" variant={theme === t ? "default" : "outline"} onClick={() => onTheme(t)} className="capitalize">
              {t}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
