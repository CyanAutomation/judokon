import { describe, it, expect, vi, afterEach } from "vitest";
import { resetDom } from "../utils/testUtils.js";

afterEach(resetDom);

describe("onDomReady", () => {
  it("runs callback immediately when document is ready", async () => {
    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true
    });
    const { onDomReady } = await import("../../src/helpers/domReady.js");
    const fn = vi.fn();
    onDomReady(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs callback after DOMContentLoaded when loading", async () => {
    Object.defineProperty(document, "readyState", {
      value: "loading",
      configurable: true
    });
    const addSpy = vi.spyOn(document, "addEventListener");
    const { onDomReady } = await import("../../src/helpers/domReady.js");
    const fn = vi.fn();
    onDomReady(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith("DOMContentLoaded", fn, { once: true });
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
