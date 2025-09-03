import { describe, it, expect, vi } from "vitest";
import { registerModal, onEsc, offEsc } from "../../src/helpers/modalManager.js";
import { withMutedConsole } from "../utils/console.js";

describe("modal manager callbacks", () => {
  it("notifies callbacks with overlay before closing", () => {
    const overlay = { close: vi.fn() };
    registerModal(overlay);
    const cb = vi.fn();
    onEsc(cb);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(cb).toHaveBeenCalledWith(overlay);
    expect(overlay.close).toHaveBeenCalledTimes(1);
    offEsc(cb);
  });

  it("removes overlay even if close throws", async () => {
    const overlay = {
      close: vi.fn(() => {
        throw new Error("boom");
      })
    };
    registerModal(overlay);
    await withMutedConsole(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(overlay.close).toHaveBeenCalledTimes(1);
  });
});
