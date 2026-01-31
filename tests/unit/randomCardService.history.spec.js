import { describe, it, expect } from "vitest";

import { createHistoryManager } from "../../src/helpers/randomCard.js";

describe("createHistoryManager", () => {
  it("returns a shallow copy from add without leaking internal state", () => {
    const manager = createHistoryManager(2);
    const first = { id: 1 };
    const second = { id: 2 };
    const third = { id: 3 };

    const nullHistory = manager.add(null);
    expect(nullHistory).toEqual([]);
    nullHistory.push({ id: 999 });
    expect(nullHistory).toEqual([{ id: 999 }]);
    expect(manager.get()).toEqual([]);

    const undefinedHistory = manager.add(undefined);
    expect(undefinedHistory).toEqual([]);
    undefinedHistory.push({ id: 1000 });
    expect(undefinedHistory).toEqual([{ id: 1000 }]);
    expect(manager.get()).toEqual([]);

    const initialHistory = manager.add(first);
    expect(initialHistory).toEqual([first]);

    initialHistory.pop();
    expect(initialHistory).toEqual([]);
    expect(manager.get()).toEqual([first]);

    const updatedHistory = manager.add(second);
    expect(updatedHistory).toEqual([second, first]);

    updatedHistory.push({ id: 999 });
    expect(updatedHistory).toEqual([second, first, { id: 999 }]);
    expect(manager.get()).toEqual([second, first]);

    manager.add(third);
    expect(manager.get()).toEqual([third, second]);
  });
});
