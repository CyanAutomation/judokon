import { describe, it, expect, afterEach } from "vitest";
import {
  isInternalRoundModificationEnabled,
  isRoundModificationOverlayEnabled
} from "../../../src/helpers/classicBattle/roundModificationOverlay.js";

describe("roundModificationOverlay internal guardrails", () => {
  afterEach(() => {
    delete globalThis.__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__;
  });

  it("returns false when only legacy context flag is provided", () => {
    expect(isInternalRoundModificationEnabled({ flags: { roundModify: true } })).toBe(false);
  });

  it("requires both internal config and runtime guard", () => {
    const context = {
      internalConfig: {
        enableRoundModificationOverlay: true
      }
    };

    expect(isRoundModificationOverlayEnabled(context)).toBe(false);

    globalThis.__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__ = true;
    expect(isRoundModificationOverlayEnabled(context)).toBe(true);
  });
});
