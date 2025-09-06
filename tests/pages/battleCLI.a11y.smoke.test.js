import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("battleCLI.html static selectors", () => {
  it("exposes required DOM hooks", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
    expect(document.getElementById("cli-countdown")).toBeTruthy();
    expect(document.getElementById("round-message")).toBeTruthy();
    expect(document.getElementById("cli-score")).toBeTruthy();
    const root = document.getElementById("cli-root");
    expect(root?.getAttribute("data-round")).not.toBeNull();
    expect(root?.getAttribute("data-target")).not.toBeNull();
    const countdown = document.getElementById("cli-countdown");
    expect(countdown?.getAttribute("data-remaining-time")).not.toBeNull();
  });
});
