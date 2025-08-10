import { describe, it, expect, vi, beforeEach } from "vitest";

describe("resetGame reattaches Next button handler", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("clones Next button and wires onNextButtonClick", async () => {
    const onNextButtonClick = vi.fn();

    vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
      onNextButtonClick
    }));

    // Original Next button before reset
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.dataset.nextReady = "true"; // simulate previously ready state
    document.body.appendChild(btn);

    const { resetGame } = await import("../../../src/helpers/classicBattle/roundManager.js");

    // Act: reset replaces the button and reattaches the click handler
    resetGame();

    const cloned = document.getElementById("next-button");
    expect(cloned).not.toBe(btn); // ensure it was replaced
    expect(cloned.classList.contains("disabled")).toBe(true);
    expect(cloned.dataset.nextReady).toBeUndefined();

    // Clicking should invoke the reattached handler
    cloned.click();
    expect(onNextButtonClick).toHaveBeenCalledTimes(1);
  });
});
