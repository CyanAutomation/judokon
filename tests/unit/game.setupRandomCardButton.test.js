import { describe, it, expect, vi, afterEach } from "vitest";

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  document.body.innerHTML = "";
});

const setupTest = async () => {
  vi.resetModules();
  const generateRandomCard = vi.fn();
  const shouldReduceMotionSync = vi.fn().mockReturnValue(false);

  vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
  vi.doMock("../../src/helpers/motionUtils.js", () => ({ shouldReduceMotionSync }));

  const module = await import("../../src/game.js");
  const button = document.createElement("button");
  const container = document.createElement("div");
  document.body.append(button, container);

  return {
    ...module,
    button,
    container,
    generateRandomCard,
    shouldReduceMotionSync
  };
};

describe("setupRandomCardButton", () => {
  it("disables the button while a card is being generated and restores it afterwards", async () => {
    const { setupRandomCardButton, button, container, generateRandomCard, shouldReduceMotionSync } =
      await setupTest();
    const deferred = createDeferred();
    generateRandomCard.mockReturnValueOnce(deferred.promise);
    shouldReduceMotionSync.mockReturnValueOnce(true);
    container.innerHTML = "<p>existing</p>";

    setupRandomCardButton(button, container);
    button.click();

    expect(button.classList.contains("hidden")).toBe(true);
    expect(button.disabled).toBe(true);
    expect(container.innerHTML).toBe("");
    expect(generateRandomCard).toHaveBeenCalledTimes(1);
    expect(shouldReduceMotionSync).toHaveBeenCalledTimes(1);
    expect(generateRandomCard).toHaveBeenCalledWith(null, null, container, true, undefined, {
      enableInspector: false
    });

    deferred.resolve();
    await deferred.promise;
    await Promise.resolve();

    expect(button.classList.contains("hidden")).toBe(false);
    expect(button.disabled).toBe(false);
  });

  it("re-enables the button even if card generation fails", async () => {
    const { setupRandomCardButton, button, container, generateRandomCard } = await setupTest();
    const error = new Error("generation failed");
    generateRandomCard.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    setupRandomCardButton(button, container);
    button.click();

    await vi.waitFor(() => {
      expect(button.classList.contains("hidden")).toBe(false);
      expect(button.disabled).toBe(false);
    });

    expect(generateRandomCard).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it("does nothing when button or container is missing", async () => {
    const { setupRandomCardButton } = await setupTest();

    const container = document.createElement("div");
    container.innerHTML = "content";
    expect(() => setupRandomCardButton(null, container)).not.toThrow();
    expect(container.innerHTML).toBe("content");

    const button = document.createElement("button");
    expect(() => setupRandomCardButton(button, null)).not.toThrow();
    button.click();
    expect(button.disabled).toBe(false);
    expect(button.classList.contains("hidden")).toBe(false);
  });
});
