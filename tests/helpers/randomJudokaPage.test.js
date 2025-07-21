import { describe, it, expect, vi } from "vitest";
import { createRandomCardDom } from "../utils/testUtils.js";

describe("randomJudokaPage module", () => {
  it("passes reduced motion flag when generating cards", async () => {
    vi.useFakeTimers();
    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);
    const createButton = vi.fn(() => document.createElement("button"));
    const shouldReduceMotionSync = vi.fn(() => true);

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
    vi.doMock("../../src/components/Button.js", () => ({ createButton }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ shouldReduceMotionSync }));

    const { section, container } = createRandomCardDom();
    document.body.append(section, container);

    const { setupRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(generateRandomCard).toHaveBeenCalled();
    expect(generateRandomCard.mock.calls[0][3]).toBe(true);
    expect(typeof setupRandomJudokaPage).toBe("function");
  });
});
