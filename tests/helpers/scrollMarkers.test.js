import { describe, it, expect } from "vitest";
import { addScrollMarkers } from "../../src/helpers/carouselBuilder.js";

describe("addScrollMarkers", () => {
  it("reads offsetWidth only once", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");

    const card = document.createElement("div");
    card.className = "judoka-card";
    container.appendChild(card);

    let readCount = 0;
    Object.defineProperty(card, "offsetWidth", {
      get() {
        readCount += 1;
        return 100;
      }
    });

    addScrollMarkers(container, wrapper);

    container.scrollLeft = 50;
    container.dispatchEvent(new Event("scroll"));

    expect(readCount).toBe(1);
  });

  it("does not throw if there are no judoka-card elements", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    expect(() => addScrollMarkers(container, wrapper)).not.toThrow();
  });

  it("does not throw if container or wrapper is null", () => {
    expect(() => addScrollMarkers(null, null)).not.toThrow();
    expect(() => addScrollMarkers(undefined, undefined)).not.toThrow();
  });

  it("does not read offsetWidth if no judoka-card exists", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    // Should not throw or read offsetWidth
    expect(() => addScrollMarkers(container, wrapper)).not.toThrow();
  });
});
