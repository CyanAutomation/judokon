import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCooldownCompletion } from "../../src/helpers/classicBattle/cooldowns.js";

describe("Inter-round cooldown auto-advance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  it("marks Next ready and dispatches ready once on finish", async () => {
    const dispatch = vi.fn();
    const machine = { dispatch };
    const button = document.createElement("button");
    button.id = "next-button";
    document.body.appendChild(button);

    const timer = { stop: vi.fn() };
    const { finish, trackFallback } = createCooldownCompletion({ machine, timer, button });
    // simulate a fallback we would clear
    const id = setTimeout(() => {}, 3000);
    trackFallback(id);

    // when finish fires, it should ready the button and dispatch
    finish();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("data-next-ready")).toBe("true");
    // dispatch is async wrapped; flush microtasks and timers
    await vi.runAllTimersAsync();
    expect(dispatch).toHaveBeenCalledWith("ready");
  });
});

