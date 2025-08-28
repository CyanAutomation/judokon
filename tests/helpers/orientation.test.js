import { describe, it, expect, afterEach, vi } from "vitest";
import { getOrientation } from "../../src/helpers/orientation.js";

const originalMatchMedia = window.matchMedia;

const mockMatchMedia = (matches) => vi.fn().mockReturnValue({ matches });

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("getOrientation", () => {
  it("returns portrait when matchMedia matches", () => {
    window.matchMedia = mockMatchMedia(true);
    expect(getOrientation()).toBe("portrait");
  });

  it("returns landscape when matchMedia does not match", () => {
    window.matchMedia = mockMatchMedia(false);
    expect(getOrientation()).toBe("landscape");
  });
});
