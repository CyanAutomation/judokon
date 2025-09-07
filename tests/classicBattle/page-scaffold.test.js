import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle page scaffold", () => {
  test("includes scoreboard regions with correct roles", () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    // Load into JSDOM
    document.documentElement.innerHTML = html;

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const msg = header.querySelector("#round-message");
    const timer = header.querySelector("#next-round-timer");
    const round = header.querySelector("#round-counter");
    const score = header.querySelector("#score-display");

    expect(msg).toBeTruthy();
    expect(timer).toBeTruthy();
    expect(round).toBeTruthy();
    expect(score).toBeTruthy();

    // aria roles / live regions
    for (const el of [msg, timer]) {
      expect(el.getAttribute("role")).toBe("status");
      expect(el.getAttribute("aria-live")).toBe("polite");
      expect(el.getAttribute("aria-atomic")).toBe("true");
    }
  });

  test("contains main battle containers and controls", () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const player = document.getElementById("player-card");
    const opponent = document.getElementById("opponent-card");
    const statButtons = document.getElementById("stat-buttons");
    const next = document.getElementById("next-button");
    const quit = document.getElementById("quit-button");
    const snackbar = document.getElementById("snackbar-container");

    expect(player).toBeTruthy();
    expect(opponent).toBeTruthy();
    expect(statButtons).toBeTruthy();
    expect(next).toBeTruthy();
    expect(quit).toBeTruthy();
    expect(snackbar).toBeTruthy();
  });
});
