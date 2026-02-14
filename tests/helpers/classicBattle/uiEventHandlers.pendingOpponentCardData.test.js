import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let testHooks;

describe("uiEventHandlers pending opponent card data clear guards", () => {
  beforeEach(async () => {
    vi.resetModules();

    ({ __testHooks: testHooks } = await import(
      "../../../src/helpers/classicBattle/uiEventHandlers.js"
    ));

    testHooks.resetPendingOpponentCardDataState();
  });

  afterEach(() => {
    testHooks.resetPendingOpponentCardDataState();
  });

  it("clears pending data for the same sequence when token matches", () => {
    testHooks.setPendingOpponentCardData({ name: "A" }, 7, 42);

    testHooks.clearPendingOpponentCardData(7, 42);

    expect(testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });

  it("ignores stale sequence clear requests", () => {
    testHooks.setPendingOpponentCardData({ name: "B" }, 8, 84);

    testHooks.clearPendingOpponentCardData(7, 84);

    expect(testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: { name: "B" },
      sequence: 8,
      token: 84
    });
  });

  it("rejects mismatched token clear requests even when sequence is clearable", () => {
    testHooks.setPendingOpponentCardData({ name: "C" }, 6, 21);

    testHooks.clearPendingOpponentCardData(6, 22);

    expect(testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: { name: "C" },
      sequence: 6,
      token: 21
    });
  });

  it("clears pending data when sequence parameter is undefined", () => {
    testHooks.setPendingOpponentCardData({ name: "D" }, 5, 33);

    testHooks.clearPendingOpponentCardData(undefined, 33);

    expect(testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });

  it("clears pending data when token parameter is undefined", () => {
    testHooks.setPendingOpponentCardData({ name: "E" }, 9, 77);

    testHooks.clearPendingOpponentCardData(9, undefined);

    expect(testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });
});
