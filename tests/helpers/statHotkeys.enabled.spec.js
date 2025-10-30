import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Stat hotkeys default enabled", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="stat-1">power</button>
      <button id="stat-2">speed</button>
    `;
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      delete window.__FF_OVERRIDES;
    }
    document.body.innerHTML = "";
  });

  it("pressing '1' clicks first stat when wireStatHotkeys is used", async () => {
    const { wireStatHotkeys } = await import("../../src/helpers/classicBattle/statButtons.js");
    const first = document.getElementById("stat-1");
    const second = document.getElementById("stat-2");
    const buttons = [first, second];
    const clickSpy = vi.spyOn(first, "click");
    const detach = wireStatHotkeys(buttons);

    const evt = new KeyboardEvent("keydown", { key: "1" });
    document.dispatchEvent(evt);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    detach();
  });

  it("does not bind hotkeys when the feature flag is disabled", async () => {
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = { statHotkeys: false };
    }
    const { wireStatHotkeys } = await import("../../src/helpers/classicBattle/statButtons.js");
    const first = document.getElementById("stat-1");
    const buttons = [first, document.getElementById("stat-2")];
    const clickSpy = vi.spyOn(first, "click");
    const detach = wireStatHotkeys(buttons);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));

    expect(clickSpy).not.toHaveBeenCalled();
    detach();
  });

  it("begins handling hotkeys when the flag toggles on", async () => {
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = { statHotkeys: false };
    }
    const [{ wireStatHotkeys }, { featureFlagsEmitter }] = await Promise.all([
      import("../../src/helpers/classicBattle/statButtons.js"),
      import("../../src/helpers/featureFlags.js")
    ]);
    const first = document.getElementById("stat-1");
    const buttons = [first, document.getElementById("stat-2")];
    const clickSpy = vi.spyOn(first, "click");
    const detach = wireStatHotkeys(buttons);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).not.toHaveBeenCalled();

    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES.statHotkeys = true;
    }
    featureFlagsEmitter.dispatchEvent(new Event("change"));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    detach();
  });
});
