import { describe, it, expect, beforeEach } from "vitest";
import {
  enableStatButtons,
  disableStatButtons
} from "../../../src/helpers/classicBattle/statButtons.js";

describe("classicBattle statButtons state helpers", () => {
  let container;
  let buttons;

  beforeEach(() => {
    document.body.innerHTML =
      '<div id="stat-buttons"><button data-stat="strength"></button><button data-stat="speed" class="selected"></button></div>';
    container = document.getElementById("stat-buttons");
    buttons = container.querySelectorAll("button[data-stat]");
  });

  it("disables buttons with matching class state", () => {
    disableStatButtons(buttons, container);

    buttons.forEach((button) => {
      expect(button.disabled).toBe(true);
      expect(button.tabIndex).toBe(-1);
      expect(button.classList.contains("disabled")).toBe(true);
    });
    expect(container?.dataset.buttonsReady).toBe("false");
  });

  it("enables buttons and removes disabled class", () => {
    disableStatButtons(buttons, container);
    enableStatButtons(buttons, container);

    buttons.forEach((button) => {
      expect(button.disabled).toBe(false);
      expect(button.tabIndex).toBe(0);
      expect(button.classList.contains("disabled")).toBe(false);
    });
    expect(container?.dataset.buttonsReady).toBe("true");
  });
});
