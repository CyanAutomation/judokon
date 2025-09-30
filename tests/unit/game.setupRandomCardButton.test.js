import { describe, it, expect, vi, afterEach } from "vitest";
import { withMutedConsole } from "../utils/console.js";

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
    const {
      setupRandomCardButton,
      button,
      container,
      generateRandomCard,
      shouldReduceMotionSync
    } = await setupTest();
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
    expect(generateRandomCard).toHaveBeenCalledWith(
      null,
      null,
      container,
      true,
      undefined,
      { enableInspector: false }
    );

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
    const addEventListenerSpy = vi.spyOn(button, "addEventListener");

    await withMutedConsole(async () => {
      setupRandomCardButton(button, container);
      const clickRegistration = addEventListenerSpy.mock.calls.find(
        ([event]) => event === "click"
      );
      expect(clickRegistration).toBeDefined();
      const [, clickHandler] = clickRegistration;
      expect(clickHandler).toBeTypeOf("function");

      const clickPromise = clickHandler.call(button, new Event("click"));

      expect(button.classList.contains("hidden")).toBe(true);
      expect(button.disabled).toBe(true);

      await expect(clickPromise).rejects.toBe(error);

      await vi.waitFor(() => {
        expect(button.classList.contains("hidden")).toBe(false);
        expect(button.disabled).toBe(false);
      });

      expect(generateRandomCard).toHaveBeenCalledTimes(1);
    });
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
