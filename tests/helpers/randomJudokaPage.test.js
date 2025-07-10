import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const html = fs.readFileSync("src/pages/randomJudoka.html", "utf8");

describe("randomJudoka.html", () => {
  it("passes reduced motion flag when generating cards", () => {
    expect(html).toMatch(/const prefersReducedMotion = shouldReduceMotionSync\(\)/);
    expect(html).toMatch(/generateRandomCard\([^)]*prefersReducedMotion[^)]*\)/);
  });
});
