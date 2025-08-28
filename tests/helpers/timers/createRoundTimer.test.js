import { describe, it, expect } from "vitest";
import { createRoundTimer } from "../../../src/helpers/timers/createRoundTimer.js";

describe("createRoundTimer events", () => {
  it("emits tick and expired", () => {
    const events = [];
    const timer = createRoundTimer({
      starter: (onTick, onExpired) => {
        onTick(2);
        onTick(1);
        onTick(0);
        onExpired();
      }
    });
    timer.on("tick", (r) => events.push(["tick", r]));
    let expired = 0;
    timer.on("expired", () => {
      expired += 1;
    });
    timer.start(2);
    expect(events).toEqual([
      ["tick", 2],
      ["tick", 1],
      ["tick", 0]
    ]);
    expect(expired).toBe(1);
  });
});
