import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";

describe("CLI input latency hardened test", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="cli-countdown"></div>';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("uses microtask scheduling seam for selection (digit path)", async () => {
    // Stub getStatByIndex via a local facade: the handler calls it via same module
    vi.spyOn(init, "getStatByIndex").mockReturnValue("power");
    // Spy selectStat via a getter on module; since it's not exported, observe via side-effect by mocking safeDispatch
    const dispatchSpy = vi.spyOn(init, "safeDispatch").mockImplementation(() => {});

    const handled = init.handleWaitingForPlayerActionKey("1");
    expect(handled).toBe(true);
    // Not yet called synchronously
    expect(dispatchSpy).not.toHaveBeenCalled();
    // Await the next microtask tick to allow the deferred selection to run
    await new Promise((resolve) => queueMicrotask(resolve));
    expect(dispatchSpy).toHaveBeenCalledWith("statSelected");
  });
});
