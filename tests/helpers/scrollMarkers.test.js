import { describe, it, expect, vi, afterEach } from "vitest";
import * as carouselBuilder from "../../src/helpers/carouselBuilder.js";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";

const { addScrollMarkers, initScrollMarkers } = carouselBuilder;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

afterEach(() => {
  setScheduler(realScheduler);
  vi.useRealTimers();
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
});

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

describe("initScrollMarkers", () => {
  it("falls back to scheduler timeouts when requestAnimationFrame is missing", () => {
    vi.useFakeTimers();
    globalThis.requestAnimationFrame = undefined;

    const fallbackScheduler = {
      setTimeout: vi.fn((cb, ms) => setTimeout(cb, ms)),
      clearTimeout: vi.fn((id) => clearTimeout(id))
    };
    setScheduler(fallbackScheduler);

    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);

    const card = document.createElement("div");
    card.className = "judoka-card";
    Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
    container.appendChild(card);

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });

    const getComputedStyleSpy = vi
      .spyOn(window, "getComputedStyle")
      .mockImplementation(() => ({ columnGap: "0px" }));

    try {
      initScrollMarkers(container, wrapper);

      expect(fallbackScheduler.setTimeout).toHaveBeenCalledTimes(1);
      expect(fallbackScheduler.setTimeout.mock.calls[0][1]).toBe(0);
      expect(wrapper.querySelector(".scroll-markers")).toBeNull();

      vi.runAllTimers();

      const markersRoot = wrapper.querySelector(".scroll-markers");
      expect(markersRoot).not.toBeNull();
    } finally {
      getComputedStyleSpy.mockRestore();
    }
  });
});
