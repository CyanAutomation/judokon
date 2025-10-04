import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const modulePath = "../../src/helpers/settingsPage.js";

const importSettingsModule = () => import(modulePath);

const dispatchSettingsReady = () => {
  const event = new Event("settings:ready");
  document.dispatchEvent(event);
  return event;
};

describe("settingsReadyPromise in browser-like environments", () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.settingsReadyPromise;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete window.settingsReadyPromise;
    document.body.innerHTML = "";
  });

  it("waits for the settings:ready event before resolving", async () => {
    const { settingsReadyPromise } = await importSettingsModule();

    let resolvedValue;
    const trackedPromise = settingsReadyPromise.then((value) => {
      resolvedValue = value;
      return value;
    });

    await Promise.resolve();
    expect(resolvedValue).toBeUndefined();

    const readyEvent = dispatchSettingsReady();

    await expect(trackedPromise).resolves.toBe(readyEvent);
    expect(resolvedValue).toBe(readyEvent);
  });

  it("notifies handlers added after the readiness event", async () => {
    const { settingsReadyPromise } = await importSettingsModule();

    const readyEvent = dispatchSettingsReady();
    await expect(settingsReadyPromise).resolves.toBe(readyEvent);

    const onResolve = vi.fn();
    settingsReadyPromise.then(onResolve);

    await Promise.resolve();
    expect(onResolve).toHaveBeenCalledWith(readyEvent);
  });

  it("exposes the readiness promise on window for tests", async () => {
    const { settingsReadyPromise } = await importSettingsModule();

    expect(window.settingsReadyPromise).toBe(settingsReadyPromise);

    const readyEvent = dispatchSettingsReady();
    await expect(window.settingsReadyPromise).resolves.toBe(readyEvent);
  });
});
