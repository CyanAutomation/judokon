import { describe, it, expect, beforeEach } from "vitest";
import {
  resetStatButtons,
  showResult,
  getStatButtons,
  getRoundMessageEl
} from "../../src/helpers/battle/battleUI.js";

const syncScheduler = {
  onFrame: (cb) => {
    cb();
    return 0;
  },
  cancel: () => {},
  setTimeout: (cb) => {
    cb();
    return 0;
  },
  clearTimeout: () => {}
};

describe("battleUI helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("resetStatButtons clears selection and re-enables buttons", () => {
    document.body.innerHTML =
      '<div id="stat-buttons" data-tooltip-id="ui.selectStat"><button class="selected" style="background-color:red"></button><button class="selected"></button></div>';
    const buttons = getStatButtons();
    resetStatButtons(syncScheduler);
    buttons.forEach((btn) => {
      expect(btn.classList.contains("selected")).toBe(false);
      expect(btn.disabled).toBe(false);
      expect(btn.style.backgroundColor).toBe("");
    });
  });

  it("showResult updates text and fades", () => {
    document.body.innerHTML = '<p id="round-message" class="fading"></p>';
    showResult("You win!", syncScheduler);
    const el = getRoundMessageEl();
    expect(el.textContent).toBe("You win!");
    expect(el.classList.contains("fade-transition")).toBe(true);
    expect(el.classList.contains("fading")).toBe(true);
  });

  it("showResult replaces previous message", () => {
    document.body.innerHTML = '<p id="round-message" class="fading"></p>';
    showResult("First", syncScheduler);
    showResult("Second", syncScheduler);
    const el = getRoundMessageEl();
    expect(el.textContent).toBe("Second");
    expect(el.classList.contains("fading")).toBe(true);
  });

  it("DOM helper functions return elements", () => {
    document.body.innerHTML =
      '<div id="stat-buttons" data-tooltip-id="ui.selectStat"><button></button></div><p id="round-message"></p>';
    expect(getStatButtons().length).toBe(1);
    expect(getRoundMessageEl()).toBeInstanceOf(HTMLElement);
  });
});
