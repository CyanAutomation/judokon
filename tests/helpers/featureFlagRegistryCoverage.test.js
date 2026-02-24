import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { FEATURE_FLAG_REGISTRY } from "../../src/config/featureFlagRegistry.js";

function collectFlagLiterals(grepOutput) {
  const flags = new Set();
  const pattern = /\b(?:isEnabled|setFlag)\(\s*["']([A-Za-z0-9_]+)["']/g;
  for (const match of grepOutput.matchAll(pattern)) {
    flags.add(match[1]);
  }
  return flags;
}

describe("feature flag registry coverage", () => {
  it("contains every literal flag used by isEnabled/setFlag callsites", () => {
    const output = execSync(
      'rg -n "\\b(?:isEnabled|setFlag)\\(\\s*[\'\\"]([A-Za-z0-9_]+)[\'\\"]" src',
      { encoding: "utf8" }
    );
    const flags = collectFlagLiterals(output);
    expect(flags.size).toBeGreaterThan(0);

    for (const flag of flags) {
      expect(Object.hasOwn(FEATURE_FLAG_REGISTRY, flag)).toBe(true);
    }
  });
});
