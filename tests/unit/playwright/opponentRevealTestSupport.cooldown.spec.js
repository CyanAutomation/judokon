import { describe, expect, it } from "vitest";

const SUPPORT_PATH = "../../../playwright/battle-classic/support/opponentRevealTestSupport.js";

describe("cooldownImmediatelyFollowsRoundOver helper", () => {
  it("returns true when cooldown follows roundOver after intermediate entries", async () => {
    const module = await import(SUPPORT_PATH);
    const { cooldownImmediatelyFollowsRoundOver } = module.__TEST_ONLY__;

    const log = [
      { to: "roundOver", from: "resolveRound" },
      { to: "opponentReveal", from: "roundOver" },
      { to: "cooldown", from: "opponentReveal" }
    ];

    expect(cooldownImmediatelyFollowsRoundOver("cooldown", log, "opponentReveal")).toBe(true);
  });

  it("falls back to previous state when logs omit a roundOver transition", async () => {
    const module = await import(SUPPORT_PATH);
    const { cooldownImmediatelyFollowsRoundOver } = module.__TEST_ONLY__;

    const log = [{ to: "cooldown", from: "opponentReveal" }];

    expect(cooldownImmediatelyFollowsRoundOver("cooldown", log, "roundOver")).toBe(true);
  });
});
