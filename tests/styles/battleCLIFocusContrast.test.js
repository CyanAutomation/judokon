import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { hex } from "wcag-contrast";

describe("battleCLI focus contrast", () => {
  it(".cli-stat:focus background contrasts with text", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    const bgMatch = html.match(/\.cli-stat:focus[^}]*background:\s*([^;]+);/);
    const textMatch = html.match(/body[^}]*color:\s*([^;]+);/);
    expect(bgMatch).toBeTruthy();
    expect(textMatch).toBeTruthy();
    const contrast = hex(bgMatch[1].trim(), textMatch[1].trim());
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
