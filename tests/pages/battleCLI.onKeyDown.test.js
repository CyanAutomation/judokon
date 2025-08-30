import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("battleCLI onKeyDown", () => {
  let onKeyDown;

  beforeEach(async () => {
    window.__TEST__ = true;
    ({ onKeyDown } = await import("../../src/pages/battleCLI.js"));
    document.body.innerHTML = `
      <div id="cli-shortcuts" hidden></div>
      <div id="snackbar-container"></div>
    `;
    document.body.className = "";
    document.body.dataset.battleState = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
    delete document.body.dataset.battleState;
    delete window.__getClassicBattleMachine;
    delete window.__TEST__;
    vi.resetModules();
  });

  it("toggles shortcuts with H key", () => {
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(document.getElementById("cli-shortcuts").hidden).toBe(false);
  });

  it("toggles retro mode with R key", () => {
    onKeyDown(new KeyboardEvent("keydown", { key: "r" }));
    expect(document.body.classList.contains("retro")).toBe(true);
  });

  it("quits on Q key", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    expect(dispatch).toHaveBeenCalledWith("interrupt", { reason: "quit" });
  });

  it("dispatches statSelected in waitingForPlayerAction state", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "waitingForPlayerAction";
    onKeyDown(new KeyboardEvent("keydown", { key: "1" }));
    expect(dispatch).toHaveBeenCalledWith("statSelected");
  });

  it("dispatches continue in roundOver state", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "roundOver";
    onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(dispatch).toHaveBeenCalledWith("continue");
  });

  it("dispatches ready in cooldown state", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "cooldown";
    onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(dispatch).toHaveBeenCalledWith("ready");
  });
});
