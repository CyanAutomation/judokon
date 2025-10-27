import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetStatButtons,
  showResult,
  getStatButtons,
  getRoundMessageEl,
  enableStatButtons,
  disableStatButtons
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

  it("enableStatButtons skips falsy button references", () => {
    const button = document.createElement("button");
    button.disabled = true;
    button.tabIndex = -1;
    button.classList.add("disabled");
    const querySpy = vi
      .spyOn(document, "querySelectorAll")
      .mockImplementation(() => [button, null]);

    enableStatButtons();

    expect(button.disabled).toBe(false);
    expect(button.tabIndex).toBe(0);
    expect(button.classList.contains("disabled")).toBe(false);
    querySpy.mockRestore();
  });

  it("disableStatButtons skips falsy button references", () => {
    const button = document.createElement("button");
    button.disabled = false;
    button.classList.remove("disabled");
    const querySpy = vi
      .spyOn(document, "querySelectorAll")
      .mockImplementation(() => [button, undefined]);

    disableStatButtons();

    expect(button.disabled).toBe(true);
    expect(button.classList.contains("disabled")).toBe(true);
    querySpy.mockRestore();
  });

  it("resetStatButtons tolerates falsy button references", () => {
    const button = document.createElement("button");
    button.classList.add("selected");
    button.style.backgroundColor = "red";
    const querySpy = vi
      .spyOn(document, "querySelectorAll")
      .mockImplementation(() => [button, null]);

    resetStatButtons(syncScheduler);

    expect(button.classList.contains("selected")).toBe(false);
    expect(button.disabled).toBe(false);
    expect(button.style.backgroundColor).toBe("");
    querySpy.mockRestore();
  });

  it("DOM helper functions return elements", () => {
    document.body.innerHTML =
      '<div id="stat-buttons" data-tooltip-id="ui.selectStat"><button></button></div><p id="round-message"></p>';
    expect(getStatButtons().length).toBe(1);
    expect(getRoundMessageEl()).toBeInstanceOf(HTMLElement);
  });
});
