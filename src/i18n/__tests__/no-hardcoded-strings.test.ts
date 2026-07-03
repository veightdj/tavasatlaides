import { describe, it, expect } from "vitest";
import { scanProject, formatFindings } from "../../../scripts/i18n-lint";

describe("i18n-lint — no hardcoded user-facing strings", () => {
  it("scans src/components and src/routes and reports zero findings", () => {
    const findings = scanProject(process.cwd());
    if (findings.length > 0) {
      // eslint-disable-next-line no-console
      console.error(formatFindings(findings));
    }
    expect(findings, formatFindings(findings)).toEqual([]);
  });
});
