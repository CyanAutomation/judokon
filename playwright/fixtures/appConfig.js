import baseSettings from "../../src/data/settings.json" with { type: "json" };

function clone(value) {
  return structuredClone(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeSettings(base, overrides) {
  if (!isPlainObject(overrides)) {
    return base;
  }

  const result = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeSettings(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Performs deep equality comparison between two values with circular reference protection.
 *
 * @param {*} a - First value to compare.
 * @param {*} b - Second value to compare.
 * @param {WeakMap<object, WeakSet<object>>} visited - Internal tracking for circular references (do not pass manually).
 * @returns {boolean} True if values are deeply equal.
 * @pseudocode deepEqual(a, b)
 */
function deepEqual(a, b, visited = new WeakMap()) {
  if (a === b) {
    return true;
  }

  const isObjectLike = (value) => value !== null && typeof value === "object";
  const aIsCollection = Array.isArray(a) || isObjectLike(a);
  const bIsCollection = Array.isArray(b) || isObjectLike(b);

  if (!aIsCollection || !bIsCollection) {
    return false;
  }

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) {
    return false;
  }

  const cachedForA = visited.get(a);
  if (cachedForA?.has(b)) {
    return true;
  }
  const cachedForB = visited.get(b);
  if (cachedForB?.has(a)) {
    return true;
  }

  const ensurePair = (first, second) => {
    let visitedForFirst = visited.get(first);
    if (!visitedForFirst) {
      visitedForFirst = new WeakSet();
      visited.set(first, visitedForFirst);
    }
    visitedForFirst.add(second);
  };

  ensurePair(a, b);
  ensurePair(b, a);

  if (aIsArray) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i], visited)) {
        return false;
      }
    }
    return true;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (!Object.hasOwn(b, key)) {
      return false;
    }
    if (!deepEqual(a[key], b[key], visited)) {
      return false;
    }
  }

  return true;
}

function applyFeatureFlagOverrides(target, overrides) {
  if (!isPlainObject(overrides) || Object.keys(overrides).length === 0) {
    return false;
  }

  const baseFlags = isPlainObject(target.featureFlags)
    ? target.featureFlags
    : clone(baseSettings.featureFlags || {});
  let mutated = false;

  const resultFlags = { ...baseFlags };
  for (const [flag, enabled] of Object.entries(overrides)) {
    const baseEntry = isPlainObject(baseFlags[flag]) ? baseFlags[flag] : {};
    resultFlags[flag] = { ...baseEntry, enabled: Boolean(enabled) };
    mutated = true;
  }

  if (mutated) {
    target.featureFlags = resultFlags;
  }

  return mutated;
}

function normalizeTestModePreference(preference) {
  if (preference === "disable") return false;
  if (preference === "inherit") return null;
  return true;
}

async function overrideSettingsFetch(page, overrides) {
  if (!overrides) return () => Promise.resolve();
  const pattern = "**/src/data/settings.json";
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(overrides)
    });
    await page.unroute(pattern);
  });
  return async () => {
    try {
      await page.unroute(pattern);
    } catch {}
  };
}

async function waitForTestApi(page, accessor, { timeout = 10_000 } = {}) {
  await page.waitForFunction(accessor, null, { timeout });
}

function createNavigatorSanitizer(page) {
  return page.addInitScript(() => {
    const path = typeof location?.pathname === "string" ? location.pathname : "";
    if (!/battleClassic|battleCLI/.test(path)) {
      return;
    }
    try {
      const userAgent = navigator.userAgent || "";
      const sanitized = userAgent.replace(/HeadlessChrome/gi, "Chrome").replace(/Headless/gi, "");
      Object.defineProperty(navigator, "userAgent", { get: () => sanitized });
    } catch {}
    try {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    } catch {}
  });
}

function createTestModeDisableScript() {
  return () => {
    try {
      const raw = localStorage.getItem("settings");
      const parsed = raw ? JSON.parse(raw) : {};
      const cloneIfPlainObject = (value) =>
        value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};

      const next = cloneIfPlainObject(parsed);
      const featureFlags = cloneIfPlainObject(next.featureFlags);
      const currentEntry = cloneIfPlainObject(featureFlags.enableTestMode);

      // Force the enableTestMode flag off while preserving other stored properties.
      featureFlags.enableTestMode = { ...currentEntry, enabled: false };
      next.featureFlags = featureFlags;

      localStorage.setItem("settings", JSON.stringify(next));
    } catch {
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
      );
    }
  };
}

export async function configureApp(page, options = {}) {
  const {
    featureFlags = {},
    settings: settingsOverrides = {},
    battle = {},
    testMode = "enable",
    requireRoundSelectModal = false
  } = options;

  const desiredTestMode = normalizeTestModePreference(testMode);
  const merged = clone(baseSettings);
  let mutated = false;

  if (desiredTestMode !== null) {
    const current = !!merged?.featureFlags?.enableTestMode?.enabled;
    if (current !== desiredTestMode) {
      if (!isPlainObject(merged.featureFlags)) {
        merged.featureFlags = {};
      }
      const baseEntry = isPlainObject(merged.featureFlags.enableTestMode)
        ? merged.featureFlags.enableTestMode
        : clone(baseSettings?.featureFlags?.enableTestMode || {});
      merged.featureFlags.enableTestMode = { ...baseEntry, enabled: desiredTestMode };
      mutated = true;
    }
  }

  if (Object.keys(settingsOverrides).length > 0) {
    const nextSettings = mergeSettings(merged, settingsOverrides);
    if (!deepEqual(nextSettings, merged)) {
      Object.assign(merged, nextSettings);
      mutated = true;
    }
  }

  const flagsMutated = applyFeatureFlagOverrides(merged, featureFlags);
  mutated = mutated || flagsMutated;

  let cleanup = async () => {};
  if (mutated) {
    cleanup = await overrideSettingsFetch(page, merged);
  }

  let navigatorScript = null;
  if (requireRoundSelectModal) {
    navigatorScript = await createNavigatorSanitizer(page);
  }

  const runtimeTasks = [];
  let testModeScript = null;

  if (desiredTestMode === false) {
    testModeScript = await page.addInitScript(createTestModeDisableScript());
  }

  if ("pointsToWin" in battle) {
    runtimeTasks.push(async () => {
      await waitForTestApi(page, () => window.__TEST_API?.engine?.setPointsToWin);
      await page.waitForFunction(
        (value) => {
          const engine = window.__TEST_API?.engine;
          if (
            !engine ||
            typeof engine.setPointsToWin !== "function" ||
            typeof engine.getPointsToWin !== "function"
          ) {
            return false;
          }
          try {
            engine.setPointsToWin(value);
            return engine.getPointsToWin() === value;
          } catch {
            return false;
          }
        },
        battle.pointsToWin,
        { timeout: 7000 }
      );
    });
  }

  return {
    async applyRuntime() {
      for (const task of runtimeTasks) {
        await task();
      }
    },
    async cleanup() {
      await cleanup();
      if (navigatorScript) {
        try {
          await navigatorScript;
        } catch {}
      }
      if (testModeScript) {
        try {
          await testModeScript;
        } catch {}
      }
    }
  };
}

export async function createDeferredResponse(page, urlPattern, fulfill) {
  let released = false;
  let release;
  const gate = new Promise((resolve) => {
    release = () => {
      if (released) return;
      released = true;
      resolve();
    };
  });

  await page.route(urlPattern, async (route) => {
    await gate;
    try {
      if (typeof fulfill === "function") {
        await fulfill(route);
      } else {
        await route.continue();
      }
    } finally {
      await page.unroute(urlPattern);
    }
  });

  return {
    release,
    async cancel() {
      release();
      try {
        await page.unroute(urlPattern);
      } catch {}
    }
  };
}
