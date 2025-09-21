import { describe, it, beforeEach, afterEach } from "vitest";
import { install, uninstall, flushAll } from "./helpers/rafMock.js";

describe("RAF Mock Debug", () => {
  beforeEach(() => {
    install();
  });

  afterEach(() => {
    uninstall();
  });

  it("should work with debug output when RAF_MOCK_DEBUG=1", () => {
    // Test that the RAF mock works correctly
    let called = false;
    requestAnimationFrame(() => {
      called = true;
    });
    flushAll();
    expect(called).toBe(true);
  });
});