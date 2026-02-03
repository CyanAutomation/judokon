import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/helpers/classicBattle/opponentPromptTracker.js", async () => {
  const actual = await vi.importActual("../../src/helpers/classicBattle/opponentPromptTracker.js");
  return {
    ...actual,
    recordOpponentPromptTimestamp: vi.fn()
  };
});

import { recordOpponentPromptTimestamp } from "../../src/helpers/classicBattle/opponentPromptTracker.js";
import { getOpponentPromptFallbackTimerId } from "../../src/helpers/classicBattle/globalState.js";

describe("Opponent choosing intermediate state", () => {
  let originalOverrides;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalOverrides = globalThis.window?.__FF_OVERRIDES;
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = {};
    }
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      if (originalOverrides === undefined) {
        delete window.__FF_OVERRIDES;
      } else {
        window.__FF_OVERRIDES = originalOverrides;
      }
      delete window.__OPPONENT_RESOLVE_DELAY_MS;
      delete window.__battleClassicState;
    }
  });

  it("no longer records timestamp during selection prep", async () => {
    recordOpponentPromptTimestamp.mockClear();
    const { prepareUiBeforeSelection } = await import("../../src/pages/battleClassic.init.js");
    // Trigger
    const delay = prepareUiBeforeSelection();
    expect(delay).toBe(0);
    expect(recordOpponentPromptTimestamp).not.toHaveBeenCalled();
  });

  it("still skips timestamp recording when delay override is set", async () => {
    recordOpponentPromptTimestamp.mockClear();
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES.opponentDelayMessage = true;
      window.__OPPONENT_RESOLVE_DELAY_MS = 1200;
    }
    const { prepareUiBeforeSelection } = await import("../../src/pages/battleClassic.init.js");
    const delay = prepareUiBeforeSelection();
    expect(delay).toBe(0);
    expect(recordOpponentPromptTimestamp).not.toHaveBeenCalled();
    expect(getOpponentPromptFallbackTimerId()).toBe(0);
  });
});
