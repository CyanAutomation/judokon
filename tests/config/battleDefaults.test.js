import { describe, test, expect } from "vitest";
import { POINTS_TO_WIN_OPTIONS } from "../../src/config/battleDefaults.js";

describe("Battle Defaults", () => {
  test("POINTS_TO_WIN_OPTIONS includes 3, 5, 10", () => {
    expect(POINTS_TO_WIN_OPTIONS).toEqual([3, 5, 10]);
  });
});
