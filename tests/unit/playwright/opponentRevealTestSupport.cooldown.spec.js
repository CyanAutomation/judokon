import { beforeAll, describe, expect, it } from "vitest";

const SUPPORT_PATH = "../../../playwright/battle-classic/support/opponentRevealTestSupport.js";

describe("cooldownImmediatelyFollowsRoundOver helper", () => {
  let cooldownImmediatelyFollowsRoundOver;

  beforeAll(async () => {
    const module = await import(SUPPORT_PATH);
    ({ cooldownImmediatelyFollowsRoundOver } = module.__TEST_ONLY__);
  });

  it("returns true when cooldown follows roundOver after intermediate entries", () => {
    const log = [
      { to: "roundOver", from: "resolveRound" },
      { to: "opponentReveal", from: "roundOver" },
      { to: "cooldown", from: "opponentReveal" }
    ];

    expect(cooldownImmediatelyFollowsRoundOver("cooldown", log, "opponentReveal")).toBe(true);
  });

  it("falls back to previous state when logs omit a roundOver transition", () => {
    const log = [{ to: "cooldown", from: "opponentReveal" }];

    expect(cooldownImmediatelyFollowsRoundOver("cooldown", log, "roundOver")).toBe(true);
  });

  it("returns false when neither logs nor previous state include a roundOver transition", () => {
    const log = [{ to: "cooldown", from: "opponentReveal" }];

    expect(cooldownImmediatelyFollowsRoundOver("cooldown", log, "opponentReveal")).toBe(false);
  });
});
