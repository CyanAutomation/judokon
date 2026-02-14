import { beforeEach, describe, expect, it } from "vitest";
import { __testHooks } from "../../../src/helpers/classicBattle/uiEventHandlers.js";

describe("uiEventHandlers pending opponent card data clear guards", () => {
  beforeEach(() => {
    __testHooks.resetPendingOpponentCardDataState();
  });

  it("clears pending data for the same sequence when token matches", () => {
    __testHooks.setPendingOpponentCardData({ name: "A" }, 7, 42);

    __testHooks.clearPendingOpponentCardData(7, 42);

    expect(__testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });

  it("ignores stale sequence clear requests", () => {
    __testHooks.setPendingOpponentCardData({ name: "B" }, 8, 84);

    __testHooks.clearPendingOpponentCardData(7, 84);

    expect(__testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: { name: "B" },
      sequence: 8,
      token: 84
    });
  });

  it("rejects mismatched token clear requests even when sequence is clearable", () => {
    __testHooks.setPendingOpponentCardData({ name: "C" }, 6, 21);

    __testHooks.clearPendingOpponentCardData(6, 22);

    expect(__testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: { name: "C" },
      sequence: 6,
      token: 21
    });
  });

  it("clears pending data when sequence parameter is undefined", () => {
    __testHooks.setPendingOpponentCardData({ name: "D" }, 5, 33);

    __testHooks.clearPendingOpponentCardData(undefined, 33);

    expect(__testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });

  it("clears pending data when token parameter is undefined", () => {
    __testHooks.setPendingOpponentCardData({ name: "E" }, 9, 77);

    __testHooks.clearPendingOpponentCardData(9, undefined);

    expect(__testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });
});
