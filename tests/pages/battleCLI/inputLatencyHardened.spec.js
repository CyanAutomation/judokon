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

  it("uses microtask scheduling seam for selection (digit path)", () => {
    let scheduledCallback;
    const originalResolve = Promise.resolve.bind(Promise);
    vi.spyOn(Promise, "resolve").mockImplementation((value) => {
      // Only intercept the first microtask scheduling to capture the callback.
      if (scheduledCallback) {
        return originalResolve(value);
      }

      const placeholder = {
        then(onFulfilled, onRejected) {
          if (typeof onFulfilled === "function") {
            scheduledCallback = onFulfilled;
          }
          return placeholder;
        },
        catch() {
          return placeholder;
        },
        finally() {
          return placeholder;
        },
        [Symbol.toStringTag]: "Promise"
      };

      return placeholder;
    });
    // Stub getStatByIndex via a local facade: the handler calls it via same module
    vi.spyOn(init, "getStatByIndex").mockReturnValue("power");
    // Spy selectStat via a getter on module; since it's not exported, observe via side-effect by mocking safeDispatch
    const dispatchSpy = vi.spyOn(init, "safeDispatch").mockImplementation(() => {});

    const handled = init.handleWaitingForPlayerActionKey("1");
    expect(handled).toBe(true);
    // Not yet called synchronously
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(typeof scheduledCallback).toBe("function");
    // Manually trigger the deferred callback captured from the microtask
    scheduledCallback();
    expect(dispatchSpy).toHaveBeenCalledWith("statSelected");
  });
});
