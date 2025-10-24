import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";
import cliState from "../../../src/pages/battleCLI/state.js";

describe("CLI input latency hardened test", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="cli-countdown"></div>';
  });
  afterEach(() => {
    cliState.ignoreNextAdvanceClick = false;
    cliState.roundResolving = false;
    cliState.shortcutsReturnFocus = null;
    cliState.shortcutsOverlay = null;
    cliState.escapeHandledPromise = new Promise((resolve) => {
      cliState.escapeHandledResolve = resolve;
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("uses microtask scheduling seam for selection (digit path)", async () => {
    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.stat = "power";
    statDiv.dataset.statIndex = "1";
    list.appendChild(statDiv);
    document.body.appendChild(list);

    const handled = init.handleWaitingForPlayerActionKey("1");
    expect(handled).toBe(true);

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(cliState.roundResolving).toBe(true);
    expect(statDiv.classList.contains("selected")).toBe(true);
  });
});
