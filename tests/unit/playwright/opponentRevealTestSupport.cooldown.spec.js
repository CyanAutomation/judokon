import { beforeAll, describe, expect, it } from "vitest";

const SUPPORT_PATH = "../../../playwright/battle-classic/support/opponentRevealTestSupport.js";

describe("cooldownImmediatelyFollowsRoundOver helper", () => {
  let cooldownImmediatelyFollowsRoundOver;

  beforeAll(async () => {
    const module = await import(SUPPORT_PATH);
    ({ cooldownImmediatelyFollowsRoundOver } = module.__TEST_ONLY__);
  });

  it("returns true when cooldown follows roundDisplay after intermediate entries", () => {
    const log = [
      { to: "roundDisplay", from: "resolveRound" },
      { to: "opponentReveal", from: "roundDisplay" },
      { to: "roundWait", from: "opponentReveal" }
    ];

    expect(cooldownImmediatelyFollowsRoundOver("roundWait", log, "opponentReveal")).toBe(true);
  });

  it("falls back to previous state when logs omit a roundDisplay transition", () => {
    const log = [{ to: "roundWait", from: "opponentReveal" }];

    expect(cooldownImmediatelyFollowsRoundOver("roundWait", log, "roundDisplay")).toBe(true);
  });

  it("returns false when neither logs nor previous state include a roundDisplay transition", () => {
    const log = [{ to: "roundWait", from: "opponentReveal" }];

    expect(cooldownImmediatelyFollowsRoundOver("roundWait", log, "opponentReveal")).toBe(false);
  });
});
