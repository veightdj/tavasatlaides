import { describe, it, expect } from "vitest";
import { dict, type Lang } from "../dictionaries";

type Node = string | string[] | { [k: string]: Node };

const LANGS: Lang[] = ["lv", "en", "ru"];
const CYRILLIC = /[\u0400-\u04FF]/;
const LV_DIACRITICS = /[āčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]/;

// Tokens allowed to appear verbatim across locales (brand, currency, i18n code names, etc.)
const WHITELIST_PATHS = new Set<string>([
  "appName",
  "nav.brand",
]);

function walk(node: Node, prefix: string, visit: (path: string, value: unknown) => void) {
  if (typeof node === "string" || Array.isArray(node)) {
    visit(prefix, node);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    walk(v as Node, prefix ? `${prefix}.${k}` : k, visit);
  }
}

function collectPaths(root: Node): Map<string, unknown> {
  const out = new Map<string, unknown>();
  walk(root, "", (p, v) => out.set(p, v));
  return out;
}

describe("i18n dictionaries — key parity", () => {
  const perLang = new Map<Lang, Map<string, unknown>>(
    LANGS.map((l) => [l, collectPaths(dict[l] as unknown as Node)]),
  );
  const lvKeys = [...perLang.get("lv")!.keys()].sort();

  for (const lang of LANGS) {
    if (lang === "lv") continue;
    it(`${lang} has the exact same key set as lv`, () => {
      const keys = [...perLang.get(lang)!.keys()].sort();
      const missing = lvKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !lvKeys.includes(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  }
});

describe("i18n dictionaries — no empty leaves & array parity", () => {
  it("every leaf in every locale is a non-empty string or an array of non-empty strings", () => {
    const failures: string[] = [];
    for (const lang of LANGS) {
      walk(dict[lang] as unknown as Node, "", (path, value) => {
        if (Array.isArray(value)) {
          if (value.length === 0) failures.push(`${lang}:${path} — empty array`);
          value.forEach((v, i) => {
            if (typeof v !== "string" || v.trim().length === 0) {
              failures.push(`${lang}:${path}[${i}] — empty or non-string`);
            }
          });
          return;
        }
        if (typeof value !== "string") {
          failures.push(`${lang}:${path} — not a string (${typeof value})`);
          return;
        }
        if (value.trim().length === 0) failures.push(`${lang}:${path} — empty string`);
      });
    }
    expect(failures).toEqual([]);
  });

  it("array-valued keys have identical length across locales", () => {
    const lvMap = collectPaths(dict.lv as unknown as Node);
    const mismatches: string[] = [];
    for (const [path, value] of lvMap) {
      if (!Array.isArray(value)) continue;
      const lens = LANGS.map((l) => {
        const v = collectPaths(dict[l] as unknown as Node).get(path);
        return Array.isArray(v) ? v.length : -1;
      });
      if (new Set(lens).size !== 1) {
        mismatches.push(`${path} — lv=${lens[0]} en=${lens[1]} ru=${lens[2]}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("i18n dictionaries — no cross-language leakage", () => {
  it("ru leaves are Cyrillic-bearing and free of Latvian-only diacritics", () => {
    const bad: string[] = [];
    walk(dict.ru as unknown as Node, "", (path, value) => {
      if (WHITELIST_PATHS.has(path)) return;
      const values = Array.isArray(value) ? value : [value as string];
      values.forEach((v, i) => {
        const label = Array.isArray(value) ? `${path}[${i}]` : path;
        if (typeof v !== "string") return;
        const hasLetters = /\p{L}/u.test(v);
        if (hasLetters && !CYRILLIC.test(v)) bad.push(`ru:${label} — expected Cyrillic: "${v}"`);
        if (LV_DIACRITICS.test(v)) bad.push(`ru:${label} — contains Latvian diacritics: "${v}"`);
      });
    });
    expect(bad).toEqual([]);
  });

  it("lv leaves are free of Cyrillic", () => {
    const bad: string[] = [];
    walk(dict.lv as unknown as Node, "", (path, value) => {
      if (WHITELIST_PATHS.has(path)) return;
      const values = Array.isArray(value) ? value : [value as string];
      values.forEach((v, i) => {
        if (typeof v !== "string") return;
        const label = Array.isArray(value) ? `${path}[${i}]` : path;
        if (CYRILLIC.test(v)) bad.push(`lv:${label} — contains Cyrillic: "${v}"`);
      });
    });
    expect(bad).toEqual([]);
  });

  it("en leaves are free of Cyrillic and Latvian diacritics", () => {
    const bad: string[] = [];
    walk(dict.en as unknown as Node, "", (path, value) => {
      if (WHITELIST_PATHS.has(path)) return;
      const values = Array.isArray(value) ? value : [value as string];
      values.forEach((v, i) => {
        if (typeof v !== "string") return;
        const label = Array.isArray(value) ? `${path}[${i}]` : path;
        if (CYRILLIC.test(v)) bad.push(`en:${label} — contains Cyrillic: "${v}"`);
        if (LV_DIACRITICS.test(v)) bad.push(`en:${label} — contains Latvian diacritics: "${v}"`);
      });
    });
    expect(bad).toEqual([]);
  });
});
