import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("battleCLI controls hint", () => {
  it("includes static controls hint near footer", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
    const hint = document.getElementById("cli-controls-hint");
    expect(hint).toBeTruthy();
    expect(hint?.getAttribute("aria-hidden")).toBe("true");
    expect(hint?.textContent?.trim()).toBe(
      "[1–5] Stats · [Enter/Space] Next · [H] Help · [Q] Quit"
    );
  });
});
