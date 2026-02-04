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
  eventDispatcherMock.spy.mockImplementation(async (...args) => {
    // Delegate to the real implementation to preserve deduplication logic
    return await actual.dispatchBattleEvent(...args);
  });
  return {
    ...actual,
    dispatchBattleEvent: eventDispatcherMock.spy
  };
});
