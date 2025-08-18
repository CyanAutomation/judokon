import {
  setCachedSettings,
  getCachedSettings,
  resetCache
} from "../../src/helpers/settingsCache.js";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";

describe("settingsCache", () => {
  afterEach(() => {
    resetCache();
  });

  it("clones nested structures to avoid mutation side effects", () => {
    const source = {
      ...DEFAULT_SETTINGS,
      tooltipIds: { a: "b" },
      gameModes: { demo: true },
      featureFlags: { test: { enabled: true } }
    };
    setCachedSettings(source);
    const cached = getCachedSettings();

    source.tooltipIds.a = "changed";
    source.featureFlags.test.enabled = false;

    expect(cached.tooltipIds.a).toBe("b");
    expect(cached.featureFlags.test.enabled).toBe(true);
  });
});
