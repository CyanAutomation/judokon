import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";

describe("CLI input latency hardened test", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="cli-countdown"></div>';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("uses microtask scheduling seam for selection (digit path)", async () => {
    const schedule = vi.spyOn(init, "__scheduleMicrotask").mockImplementation((fn) => {
      // Do not run immediately — verify deferral, then run
      setTimeout(fn, 0);
    });
    // Stub getStatByIndex via a local facade: the handler calls it via same module
    const getStatByIndex = vi.spyOn(init, "getStatByIndex").mockReturnValue("power");
    // Spy selectStat via a getter on module; since it's not exported, observe via side-effect by mocking safeDispatch
    const dispatchSpy = vi.spyOn(init, "safeDispatch").mockImplementation(() => {});

    const handled = init.handleWaitingForPlayerActionKey("1");
    expect(handled).toBe(true);
    // Not yet called synchronously
    expect(dispatchSpy).not.toHaveBeenCalled();
    // Flush our timeout (microtask stand-in)
    await new Promise((r) => setTimeout(r, 0));
    expect(dispatchSpy).toHaveBeenCalledWith("statSelected");

    schedule.mockRestore();
    getStatByIndex.mockRestore();
    dispatchSpy.mockRestore();
  });
});

