import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Stat hotkeys default enabled", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="stat-1">power</button>
      <button id="stat-2">speed</button>
    `;
  });

  it("pressing '1' clicks first stat when wireStatHotkeys is used", async () => {
    const { wireStatHotkeys } = await import(
      "../../src/helpers/classicBattle/statButtons.js"
    );
    const first = document.getElementById("stat-1");
    const second = document.getElementById("stat-2");
    const buttons = [first, second];
    const clickSpy = vi.spyOn(first, "click");
    wireStatHotkeys(buttons);

    const evt = new KeyboardEvent("keydown", { key: "1" });
    document.dispatchEvent(evt);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

