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
  eventDispatcherMock.spy.mockImplementation((...args) => {
    console.log("[dedupe spy] dispatchBattleEvent", args[0]);
    return eventDispatcherMock.callThrough(...args);
  });
  return {
    ...actual,
    dispatchBattleEvent: eventDispatcherMock.spy
  };
});
