import { describe, it, expect, vi } from "vitest";
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

  it("creates scroll markers with an active state and counter", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);

    for (let i = 0; i < 4; i++) {
      const card = document.createElement("div");
      card.className = "judoka-card";
      Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
      container.appendChild(card);
    }

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 400, configurable: true });

    const getComputedStyleSpy = vi
      .spyOn(window, "getComputedStyle")
      .mockImplementation(() => ({ columnGap: "0px" }));

    try {
      addScrollMarkers(container, wrapper);

      const markersRoot = wrapper.querySelector(".scroll-markers");
      expect(markersRoot).not.toBeNull();

      const markers = Array.from(markersRoot.querySelectorAll(".scroll-marker"));
      expect(markers).toHaveLength(2);
      expect(markers[0].classList.contains("active")).toBe(true);
      expect(markers[1].classList.contains("active")).toBe(false);

      const counter = markersRoot.querySelector(".page-counter");
      expect(counter).not.toBeNull();
      expect(counter?.textContent).toBe("Page 1 of 2");
    } finally {
      getComputedStyleSpy.mockRestore();
    }
  });

  it("activates the rightmost marker when scrolled to the end", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);

    for (let i = 0; i < 4; i++) {
      const card = document.createElement("div");
      card.className = "judoka-card";
      Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
      container.appendChild(card);
    }

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 400, configurable: true });

    const getComputedStyleSpy = vi
      .spyOn(window, "getComputedStyle")
      .mockImplementation(() => ({ columnGap: "0px" }));

    try {
      addScrollMarkers(container, wrapper);

      const markersRoot = wrapper.querySelector(".scroll-markers");
      expect(markersRoot).not.toBeNull();

      const markers = Array.from(markersRoot.querySelectorAll(".scroll-marker"));
      const counter = markersRoot?.querySelector(".page-counter");
      expect(counter).not.toBeNull();

      expect(markers[0].classList.contains("active")).toBe(true);
      expect(markers[1].classList.contains("active")).toBe(false);
      expect(counter?.textContent).toBe("Page 1 of 2");

      container.scrollLeft = container.scrollWidth - container.clientWidth;
      container.dispatchEvent(new Event("scroll"));

      expect(markers[0].classList.contains("active")).toBe(false);
      expect(markers[1].classList.contains("active")).toBe(true);
      expect(counter?.textContent).toBe("Page 2 of 2");

      container.scrollLeft = 0;
      container.dispatchEvent(new Event("scroll"));

      expect(markers[0].classList.contains("active")).toBe(true);
      expect(markers[1].classList.contains("active")).toBe(false);
      expect(counter?.textContent).toBe("Page 1 of 2");
    } finally {
      getComputedStyleSpy.mockRestore();
    }
  });
});
