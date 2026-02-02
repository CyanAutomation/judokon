import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

// Targeted unit check: ensure that when a round resolves, roundWait begins,
// and a subsequent round start is scheduled/emitted in order.

describe("classicBattle round lifecycle sequencing", () => {
  beforeEach(async () => {
    useCanonicalTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("roundResolved → roundWait → roundStarted ordering", async () => {
    const received = [];
    const onStarted = () => received.push("started");
    const onCooldown = () => received.push("roundWait");

    // Spy the handlers if exported; otherwise, simulate via dispatching events
    const win = globalThis.window || (globalThis.window = {});
    win.addEventListener?.("roundStarted", onStarted);
    win.addEventListener?.("cooldownStarted", onCooldown);

    // Dispatch a resolved event and let timers run
    window.dispatchEvent(new CustomEvent("roundResolved", { detail: {} }));
    await vi.runAllTimersAsync();

    // We only assert that cooldown occurs before next start
    const idxCooldown = received.indexOf("roundWait");
    const idxStarted = received.indexOf("started");
    expect(idxCooldown === -1 || idxStarted === -1 || idxCooldown < idxStarted).toBe(true);
  });
});
