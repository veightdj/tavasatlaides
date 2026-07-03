/**
 * i18n-lint — AST scan for hardcoded user-facing strings in components/routes.
 *
 * A "user-facing" string is either:
 *   - a JSX text node with visible content, or
 *   - a string-literal value for a known user-visible prop (title, placeholder,
 *     aria-label, alt, label, description).
 *
 * A string is FLAGGED if it looks like natural language in any project locale:
 *   - contains a Cyrillic character (ru), or
 *   - contains a Latvian diacritic (lv), or
 *   - contains two or more alphabetic words separated by whitespace (en/lv).
 *
 * Escapes:
 *   - `// i18n-ignore` on the same or previous line
 *   - `// @i18n-ignore-file` anywhere in the file (top-of-file convention)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

export type Finding = {
  file: string;
  line: number;
  column: number;
  snippet: string;
  reason: string;
};

const CYRILLIC = /[\u0400-\u04FF]/;
const LV_DIACRITICS = /[āčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]/;
const HAS_TWO_WORDS = /\p{L}{2,}\s+\p{L}{2,}/u;

const USER_VISIBLE_ATTRS = new Set([
  "title",
  "placeholder",
  "aria-label",
  "aria-description",
  "alt",
  "label",
  "description",
  "tooltip",
]);

// File globs (as prefix checks) that we skip entirely.
const SKIP_PREFIXES = [
  "src/i18n/",
  "src/lib/email-templates/",
  "src/integrations/",
  "src/components/ui/", // shadcn primitives — no user copy
];

// Admin surfaces intentionally exempt (English-only per project scope).
const ADMIN_PATTERNS = [
  /(^|\/)admin\./,
  /(^|\/)_authenticated\//,
];

// Files inside these top-level dirs are scanned.
const SCAN_DIRS = ["src/components", "src/routes"];

// Test files are skipped.
const TEST_SUFFIX = /\.test\.tsx?$/;

function isSkipped(rel: string): boolean {
  if (TEST_SUFFIX.test(rel)) return true;
  if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) return true;
  if (ADMIN_PATTERNS.some((r) => r.test(rel))) return true;
  return false;
}

export function looksLikeNaturalLanguage(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;
  // Pure symbols / punctuation / numbers → skip.
  if (!/\p{L}/u.test(trimmed)) return null;
  if (CYRILLIC.test(trimmed)) return "contains Cyrillic";
  if (LV_DIACRITICS.test(trimmed)) return "contains Latvian diacritics";
  if (HAS_TWO_WORDS.test(trimmed)) return "multi-word natural-language text";
  return null;
}

function collectTsxFiles(root: string, out: string[] = []): string[] {
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectTsxFiles(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function hasIgnoreComment(source: string, position: number): boolean {
  // Look back to the start of the current or previous line for `// i18n-ignore`.
  const before = source.slice(Math.max(0, position - 200), position);
  return /\/\/\s*i18n-ignore/.test(before.split("\n").slice(-2).join("\n"));
}

export function scanFile(fileAbs: string, cwd: string): Finding[] {
  const rel = relative(cwd, fileAbs).split(sep).join("/");
  const source = readFileSync(fileAbs, "utf8");
  if (source.includes("@i18n-ignore-file")) return [];

  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];

  const record = (node: ts.Node, text: string, reason: string) => {
    if (hasIgnoreComment(source, node.getStart(sf))) return;
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({
      file: rel,
      line: pos.line + 1,
      column: pos.character + 1,
      snippet: text.trim().slice(0, 80),
      reason,
    });
  };

  const visit = (node: ts.Node) => {
    // <Tag>Some text</Tag>
    if (ts.isJsxText(node)) {
      const reason = looksLikeNaturalLanguage(node.text);
      if (reason) record(node, node.text, reason);
    }

    // <Tag prop="Some text" />
    if (ts.isJsxAttribute(node) && node.initializer) {
      const nameNode = node.name;
      const attrName = ts.isIdentifier(nameNode)
        ? nameNode.text
        : ts.isJsxNamespacedName(nameNode)
        ? `${nameNode.namespace.text}:${nameNode.name.text}`
        : "";
      if (USER_VISIBLE_ATTRS.has(attrName)) {
        const init = node.initializer;
        if (ts.isStringLiteral(init)) {
          const reason = looksLikeNaturalLanguage(init.text);
          if (reason) record(init, init.text, `${attrName}=${JSON.stringify(init.text)} — ${reason}`);
        } else if (
          ts.isJsxExpression(init) &&
          init.expression &&
          ts.isStringLiteral(init.expression)
        ) {
          const reason = looksLikeNaturalLanguage(init.expression.text);
          if (reason)
            record(
              init.expression,
              init.expression.text,
              `${attrName}={${JSON.stringify(init.expression.text)}} — ${reason}`,
            );
        }
      }
    }

    // {"Some text"} inside JSX children
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteral(node.expression) &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      const reason = looksLikeNaturalLanguage(node.expression.text);
      if (reason) record(node.expression, node.expression.text, reason);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function scanProject(cwd = process.cwd()): Finding[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    try {
      collectTsxFiles(join(cwd, dir), files);
    } catch {
      /* dir may not exist */
    }
  }
  const findings: Finding[] = [];
  for (const abs of files) {
    const rel = relative(cwd, abs).split(sep).join("/");
    if (isSkipped(rel)) continue;
    findings.push(...scanFile(abs, cwd));
  }
  return findings;
}

export function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) return "";
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = byFile.get(f.file) ?? [];
    arr.push(f);
    byFile.set(f.file, arr);
  }
  const lines: string[] = [`Found ${findings.length} hardcoded UI string(s):`];
  for (const [file, list] of byFile) {
    lines.push(`\n  ${file}`);
    for (const f of list) {
      lines.push(`    ${f.line}:${f.column} — "${f.snippet}"  (${f.reason})`);
    }
  }
  lines.push(
    "\n  Fix: move the string to src/i18n/dictionaries.ts and reference via useI18n().t.<path>.",
  );
  lines.push("  Escape hatch: add `// i18n-ignore` above the line, or `// @i18n-ignore-file` at the top.");
  return lines.join("\n");
}
