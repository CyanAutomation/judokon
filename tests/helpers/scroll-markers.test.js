import { describe, it, expect } from "vitest";
import { addScrollMarkers } from "../../helpers/carouselBuilder.js";

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
});
