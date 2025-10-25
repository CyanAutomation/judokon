import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getJudokaFixture, getGokyoFixture } from "../utils/testUtils.js";
import { setTestMode, isTestModeEnabled, getCurrentSeed } from "../../src/helpers/testModeUtils.js";

describe("generateRandomCard deterministic seeding", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../../src/helpers/cardUtils.js");
  });

  afterEach(() => {
    setTestMode(false);
  });

  it("returns the same judoka when called with the same seed", async () => {
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const judokaData = getJudokaFixture().slice(0, 5);
    const gokyoData = getGokyoFixture();

    const first = await generateRandomCard(judokaData, gokyoData, null, false, undefined, {
      skipRender: true,
      testSeed: 42
    });
    const second = await generateRandomCard(judokaData, gokyoData, null, false, undefined, {
      skipRender: true,
      testSeed: 42
    });

    expect(second).toBe(first);
  });

  it("restores the previous test mode state after selection", async () => {
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const judokaData = getJudokaFixture().slice(0, 5);
    const gokyoData = getGokyoFixture();

    setTestMode({ enabled: true, seed: 7 });
    const previousState = {
      active: isTestModeEnabled(),
      seed: getCurrentSeed()
    };

    await generateRandomCard(judokaData, gokyoData, null, false, undefined, {
      skipRender: true,
      testSeed: 99
    });

    expect(isTestModeEnabled()).toBe(previousState.active);
    expect(getCurrentSeed()).toBe(previousState.seed);
  });
});
