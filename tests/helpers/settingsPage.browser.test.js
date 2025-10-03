import { describe, it, expect, vi, afterEach } from "vitest";

const modulePath = "../../src/helpers/settingsPage.js";

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady: vi.fn()
}));

describe("settingsReadyPromise in browser-like environments", () => {
  afterEach(() => {
    vi.resetModules();
    if ("settingsReadyPromise" in window) {
      delete window.settingsReadyPromise;
    }
  });

  it("waits for the settings:ready event before resolving", async () => {
    const { settingsReadyPromise } = await import(modulePath);

    let state = "pending";
    const trackedPromise = settingsReadyPromise.then(() => {
      state = "resolved";
    });

    // Allow any synchronous microtasks to flush to detect premature resolution.
    await Promise.resolve();
    expect(state).toBe("pending");

    document.dispatchEvent(new Event("settings:ready"));

    await expect(trackedPromise).resolves.toBeUndefined();
    expect(state).toBe("resolved");
  });

  it("exposes the readiness promise on window for tests", async () => {
    const { settingsReadyPromise } = await import(modulePath);

    expect(window.settingsReadyPromise).toBe(settingsReadyPromise);
  });
});
