import { vi } from "vitest";

export const eventDispatcherMock = {
  spy: vi.fn(),
  callThrough: () => {
    throw new Error("eventDispatcher mock not initialized");
  }
};

vi.mock("../../../../src/helpers/classicBattle/eventDispatcher.js", async (importOriginal) => {
  const actual = await importOriginal();
  eventDispatcherMock.callThrough = actual.dispatchBattleEvent;
  eventDispatcherMock.spy.mockResolvedValue(true);
  return {
    ...actual,
    dispatchBattleEvent: eventDispatcherMock.spy
  };
});
