// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

const { mockConvertToPseudoJapanese } = vi.hoisted(() => ({
  mockConvertToPseudoJapanese: vi.fn((text) => `jp(${text ?? ""})`)
}));

vi.mock("../../src/helpers/pseudoJapanese/converter.js", () => ({
  convertToPseudoJapanese: mockConvertToPseudoJapanese,
  STATIC_FALLBACK: "日本語風テキスト"
}));

describe("setupLanguageToggle rapid clicks", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    mockConvertToPseudoJapanese.mockClear();
    document.body.innerHTML = `
      <button id="language-toggle" type="button">Toggle</button>
      <div id="quote">Ace</div>
    `;
  });

  afterEach(() => {
    timers.runAllTimers();
    timers.cleanup();
    document.body.innerHTML = "";
  });

  it("coalesces rapid double click into a single atomic toggle", async () => {
    const { setupLanguageToggle } = await import("../../src/helpers/pseudoJapanese/ui.js");
    const element = /** @type {HTMLElement} */ (document.getElementById("quote"));
    const button = setupLanguageToggle(element);

    button.click();
    button.click();

    await timers.advanceTimersByTimeAsync(200);

    expect(element.innerHTML).toBe("jp(Ace)");
    expect(element.classList.contains("jp-font")).toBe(true);
    expect(element.classList.contains("fading")).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(mockConvertToPseudoJapanese).toHaveBeenCalledTimes(1);
  });

  it("remains stable after rapid triple click and a subsequent normal click", async () => {
    const { setupLanguageToggle } = await import("../../src/helpers/pseudoJapanese/ui.js");
    const element = /** @type {HTMLElement} */ (document.getElementById("quote"));
    const button = setupLanguageToggle(element);

    button.click();
    button.click();
    button.click();

    await timers.advanceTimersByTimeAsync(200);

    expect(element.innerHTML).toBe("jp(Ace)");
    expect(button.getAttribute("aria-pressed")).toBe("true");

    button.click();
    await timers.advanceTimersByTimeAsync(200);

    expect(element.innerHTML).toBe("Ace");
    expect(element.classList.contains("jp-font")).toBe(false);
    expect(element.classList.contains("fading")).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(mockConvertToPseudoJapanese).toHaveBeenCalledTimes(1);
  });
});
