import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setDebugPanelEnabled } from "../../../src/helpers/classicBattle/debugPanel.js";

describe("battle debug HUD", () => {
  let writeText;
  let originalClipboard;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="wrapper">
        <div id="battle-area" tabindex="-1"></div>
      </div>
    `;
    originalClipboard = navigator.clipboard;
    writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
    window.localStorage?.removeItem("battleDebugOpen");
  });

  afterEach(() => {
    setDebugPanelEnabled(false);
    if (originalClipboard === undefined) {
      delete navigator.clipboard;
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true
      });
    }
    document.body.innerHTML = "";
  });

  it("exposes an accessible copy affordance for the debug panel", () => {
    setDebugPanelEnabled(true);

    const panel = document.getElementById("debug-panel");
    expect(panel).toBeInstanceOf(HTMLDetailsElement);
    expect(panel?.open).toBe(true);
    expect(panel?.classList.contains("hidden")).toBe(false);
    expect(panel?.nextElementSibling?.id).toBe("battle-area");

    const summary = panel?.querySelector("summary") ?? null;
    expect(summary).toBeTruthy();
    expect(summary?.firstChild?.textContent?.trim()).toBe("Battle Debug");

    const copyButton = summary?.querySelector("#debug-copy") ?? null;
    expect(copyButton).toBeInstanceOf(HTMLButtonElement);
    expect(copyButton?.textContent).toBe("Copy");
    expect(copyButton?.dataset.tooltipId).toBe("ui.copyDebug");

    const output = panel?.querySelector("#debug-output") ?? null;
    expect(output).toBeInstanceOf(HTMLElement);
    expect(output?.getAttribute("role")).toBe("status");
    expect(output?.getAttribute("aria-live")).toBe("polite");

    if (output) {
      output.textContent = "debug info";
    }

    copyButton?.focus();
    expect(document.activeElement).toBe(copyButton);

    copyButton?.click();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("debug info");
    expect(document.activeElement).toBe(copyButton);
    expect(panel?.open).toBe(true);
  });
});
