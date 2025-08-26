import { describe, it, expect, vi } from "vitest";
import { scheduleNextRound } from "@/helpers/classicBattle/timerService.js";
import { setTestMode } from "@/helpers/testModeUtils.js";
import { createTimerNodes } from "./domUtils.js";
import { setSkipHandler } from "@/helpers/classicBattle/skipHandler.js";

describe("scheduleNextRound progress", () => {
  it("resolves ready immediately in test mode", async () => {
    createTimerNodes();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setTestMode(true);
    const controls = scheduleNextRound({ matchEnded: false });
    await expect(controls.ready).resolves.toBeUndefined();
    setTestMode(false);
    setSkipHandler(null);
    vi.restoreAllMocks();
  });
});
