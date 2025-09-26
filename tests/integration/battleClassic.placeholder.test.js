import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("battleClassic.html placeholder markup", () => {
  it("contains opponent container and mystery placeholder markup", () => {
    const filePath = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(filePath, "utf8");

    expect(html.includes('id="opponent-card"')).toBe(true);
    expect(html.includes('id="mystery-card-placeholder"')).toBe(true);
  });
});

