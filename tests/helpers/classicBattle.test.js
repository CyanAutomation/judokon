import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetStatButtons,
  showResult,
  getStatButtons,
  getRoundMessageEl
} from "../../src/helpers/battle/battleUI.js";

describe("battleUI helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("resetStatButtons clears selection and re-enables buttons", () => {
    document.body.innerHTML =
      '<div id="stat-buttons" data-tooltip-id="ui.selectStat"><button class="selected" style="background-color:red"></button><button class="selected"></button></div>';
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb) => setTimeout(cb, 0));
    const buttons = getStatButtons();
    resetStatButtons();
    buttons.forEach((btn) => {
      expect(btn.classList.contains("selected")).toBe(false);
      expect(btn.disabled).toBe(true);
    });
    vi.runAllTimers();
    buttons.forEach((btn) => {
      expect(btn.disabled).toBe(false);
      expect(btn.style.backgroundColor).toBe("");
    });
  });

  it("showResult updates text and fades after delay", () => {
    document.body.innerHTML = '<p id="round-message" class="fading"></p>';
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb) => setTimeout(() => cb(performance.now()), 16));
    vi.stubGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
    showResult("You win!");
    const el = getRoundMessageEl();
    expect(el.textContent).toBe("You win!");
    expect(el.classList.contains("fade-transition")).toBe(true);
    expect(el.classList.contains("fading")).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(el.classList.contains("fading")).toBe(true);
  });

  it("showResult cancels previous fade when new text appears", () => {
    document.body.innerHTML = '<p id="round-message" class="fading"></p>';
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb) => setTimeout(() => cb(performance.now()), 16));
    vi.stubGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
    showResult("First");
    vi.advanceTimersByTime(1000);
    showResult("Second");
    const el = getRoundMessageEl();
    expect(el.textContent).toBe("Second");
    expect(el.classList.contains("fading")).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(el.classList.contains("fading")).toBe(true);
  });

  it("DOM helper functions return elements", () => {
    document.body.innerHTML =
      '<div id="stat-buttons" data-tooltip-id="ui.selectStat"><button></button></div><p id="round-message"></p>';
    expect(getStatButtons().length).toBe(1);
    expect(getRoundMessageEl()).toBeInstanceOf(HTMLElement);
  });
});
