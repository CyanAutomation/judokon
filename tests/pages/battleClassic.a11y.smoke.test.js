import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { withMutedConsole } from "../utils/console.js";

describe("battleClassic.html a11y regions", () => {
  it("includes main ARIA regions and labeled stat buttons", () => {
    const html = readFileSync("src/pages/battleClassic.html", "utf8");
    // Inject full HTML into JSDOM
    document.documentElement.innerHTML = html;

    const roundMsg = document.getElementById("round-message");
    const nextTimer = document.getElementById("next-round-timer");
    const roundCounter = document.getElementById("round-counter");
    expect(roundMsg).toBeTruthy();
    expect(nextTimer).toBeTruthy();
    expect(roundCounter).toBeTruthy();
    expect(roundMsg?.getAttribute("role")).toBe("status");
    expect(nextTimer?.getAttribute("role")).toBe("status");
    // round-counter can be a polite live region without role
    expect(roundCounter?.getAttribute("aria-live")).toBe("polite");

    const btns = Array.from(document.querySelectorAll("#stat-buttons button"));
    expect(btns.length).toBeGreaterThanOrEqual(5);
    btns.forEach((b) => {
      const hasLabel = !!b.getAttribute("aria-label");
      const hasDesc = !!b.getAttribute("aria-describedby");
      expect(hasLabel || hasDesc).toBe(true);
    });
  });

  it("provides landmark roles and focusable stat button", () => {
    const html = readFileSync("src/pages/battleClassic.html", "utf8");
    document.documentElement.innerHTML = html;
    expect(document.querySelector("header[role='banner']")).toBeTruthy();
    expect(document.querySelector("main[role='main']")).toBeTruthy();
    const firstBtn = document.querySelector("#stat-buttons button");
    expect(firstBtn).toBeTruthy();
    expect(firstBtn?.hasAttribute("disabled")).toBe(false);
    expect(firstBtn?.tabIndex).toBe(0);
  });

  it("detects duplicate ARIA region ids", async () => {
    const html = readFileSync("src/pages/battleClassic.html", "utf8");
    document.documentElement.innerHTML = html;
    const regionIds = Array.from(document.querySelectorAll("[role][id]")).map((el) => el.id);
    const unique = new Set(regionIds);
    expect(unique.size).toBe(regionIds.length);

    await withMutedConsole(async () => {
      const dup = document.createElement("div");
      dup.id = regionIds[0];
      dup.setAttribute("role", "status");
      document.body.appendChild(dup);
      const ids = Array.from(document.querySelectorAll("[role][id]")).map((el) => el.id);
      const uniqueAfter = new Set(ids);
      expect(uniqueAfter.size).toBeLessThan(ids.length);
    });
  });
});
