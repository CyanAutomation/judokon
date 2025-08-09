import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createInfoBarHeader } from "../utils/testUtils.js";
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");

beforeEach(() => {
  vi.resetModules();
  document.body.appendChild(createInfoBarHeader());
});

afterEach(() => {
  if (originalReadyState) {
    Object.defineProperty(document, "readyState", originalReadyState);
  }
});

describe("setupBattleInfoBar", () => {
  it("initializes on DOMContentLoaded and proxies methods", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    vi.useFakeTimers();

    const mod = await import("../../src/helpers/setupBattleInfoBar.js");
    const { showSnackbar, updateSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar.mockClear();
    updateSnackbar.mockClear();

    document.dispatchEvent(new Event("DOMContentLoaded"));

    mod.showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");

    const reset = mod.showTemporaryMessage("Temp");
    expect(document.getElementById("round-message").textContent).toBe("Temp");
    reset();
    expect(document.getElementById("round-message").textContent).toBe("");

    mod.showMessage("Hi");
    mod.clearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");

    mod.updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1\nOpponent: 2");

    mod.startCountdown(1);
    expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(updateSnackbar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(showSnackbar).toHaveBeenCalledTimes(1);
  });

  it("initializes immediately when DOM already loaded", async () => {
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });

    await import("../../src/helpers/setupBattleInfoBar.js");

    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("attaches to pre-existing elements", async () => {
    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true
    });
    document.body.innerHTML = "";
    document.body.appendChild(createInfoBarHeader());
    const mod = await import("../../src/helpers/setupBattleInfoBar.js");
    const { showSnackbar, updateSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar.mockClear();
    updateSnackbar.mockClear();
    mod.showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    mod.clearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");
    mod.updateScore(3, 4);
    expect(document.getElementById("score-display").textContent).toBe("You: 3\nOpponent: 4");
    vi.useFakeTimers();
    mod.startCountdown(1);
    expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(updateSnackbar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(showSnackbar).toHaveBeenCalledTimes(1);
  });
});
