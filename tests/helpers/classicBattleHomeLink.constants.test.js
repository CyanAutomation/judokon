import { describe, expect, it, vi } from "vitest";

const onDomReady = vi.fn();

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady
}));

describe("classicBattleHomeLink.constants", () => {
  it("exports constants without executing home-link side effects", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const bodyBefore = document.body.innerHTML;

    const module = await import("../../src/helpers/classicBattleHomeLink.constants.js");

    expect(module.STORE_READY_EVENT).toBe("classicBattle:store-ready");
    expect(module.STORE_POLL_INTERVAL_MS).toBe(25);
    expect(module.STORE_POLL_MAX_ATTEMPTS).toBe(80);
    expect(onDomReady).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalledWith("click", expect.any(Function));
    expect(document.body.innerHTML).toBe(bodyBefore);

    addEventListenerSpy.mockRestore();
  });
});
