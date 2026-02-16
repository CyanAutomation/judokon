// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { exposeLegacyReadinessForTests } from "../../../src/helpers/classicBattle/readinessCompat.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalVitestEnv = process.env.VITEST;

function setTestEnvironment({ nodeEnv = "production", vitest = undefined } = {}) {
  process.env.NODE_ENV = nodeEnv;
  if (vitest === undefined) {
    delete process.env.VITEST;
    return;
  }
  process.env.VITEST = vitest;
}

afterEach(() => {
  delete window.__battleInitComplete;
  delete window.battleReadyPromise;
  delete window.__PLAYWRIGHT_TEST__;
  delete globalThis.__PLAYWRIGHT_TEST__;

  process.env.NODE_ENV = originalNodeEnv;
  if (originalVitestEnv === undefined) {
    delete process.env.VITEST;
  } else {
    process.env.VITEST = originalVitestEnv;
  }
});

describe("readinessCompat", () => {
  it("exposes legacy readiness globals for Playwright test contexts", async () => {
    setTestEnvironment();
    globalThis.__PLAYWRIGHT_TEST__ = true;

    const readyPromise = Promise.resolve("ready");
    exposeLegacyReadinessForTests(readyPromise);

    await readyPromise;

    expect(window.battleReadyPromise).toBe(readyPromise);
    expect(window.__battleInitComplete).toBe(true);
  });

  it("does not expose legacy readiness globals outside recognized test contexts", async () => {
    setTestEnvironment();

    const readyPromise = Promise.resolve("ready");
    exposeLegacyReadinessForTests(readyPromise);

    await readyPromise;

    expect(window.battleReadyPromise).toBeUndefined();
    expect(window.__battleInitComplete).toBeUndefined();
  });
});
