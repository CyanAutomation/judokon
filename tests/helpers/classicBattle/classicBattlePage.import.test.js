import { describe, it, expect } from "vitest";

describe("classicBattlePage module", () => {
  it("loads without missing exports", async () => {
    const mod = await import("../../../src/helpers/classicBattlePage.js");
    expect(typeof mod.setupClassicBattlePage).toBe("function");
  });
});
