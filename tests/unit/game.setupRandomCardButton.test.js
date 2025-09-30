import { describe, it, expect, vi, afterEach } from "vitest";

const createDeferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
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
    const { setupRandomCardButton, button, container, generateRandomCard } = await setupTest();
    const deferred = createDeferred();
    generateRandomCard.mockReturnValueOnce(deferred.promise);

    const addEventListenerSpy = vi.spyOn(button, "addEventListener");
    setupRandomCardButton(button, container);
    const handler = addEventListenerSpy.mock.calls[0][1];

    const handlerPromise = handler(new Event("click"));

    expect(button.classList.contains("hidden")).toBe(true);
    expect(button.disabled).toBe(true);

    deferred.resolve();
    await handlerPromise;

    expect(button.classList.contains("hidden")).toBe(false);
    expect(button.disabled).toBe(false);
    expect(generateRandomCard).toHaveBeenCalledTimes(1);
  });

  it("re-enables the button even if card generation fails", async () => {
    const { setupRandomCardButton, button, container, generateRandomCard } = await setupTest();
    const error = new Error("generation failed");
    generateRandomCard.mockRejectedValueOnce(error);

    const addEventListenerSpy = vi.spyOn(button, "addEventListener");
    setupRandomCardButton(button, container);
    const handler = addEventListenerSpy.mock.calls[0][1];

    await handler(new Event("click")).catch(() => {});

    expect(button.classList.contains("hidden")).toBe(false);
    expect(button.disabled).toBe(false);
    expect(generateRandomCard).toHaveBeenCalledTimes(1);
  });
});
