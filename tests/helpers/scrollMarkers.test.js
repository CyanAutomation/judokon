import { describe, it, expect, vi, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import * as carouselBuilder from "../../src/helpers/carouselBuilder.js";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";

const { addScrollMarkers, initScrollMarkers } = carouselBuilder;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
let timers;

afterEach(() => {
  setScheduler(realScheduler);
  timers?.cleanup();
  timers = undefined;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
});

describe("addScrollMarkers", () => {
  it("creates the expected number of scroll markers", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);
    container.style.columnGap = "0px";

    for (let i = 0; i < 4; i++) {
      const card = document.createElement("div");
      card.className = "judoka-card";
      Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
      container.appendChild(card);
    }

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 400, configurable: true });

    addScrollMarkers(container, wrapper);

    const markersRoot = wrapper.querySelector(".scroll-markers");
    expect(markersRoot).not.toBeNull();

    const markers = Array.from(markersRoot.querySelectorAll(".scroll-marker"));
    expect(markers).toHaveLength(2);
  });

  it("updates the active marker when scrolling between pages", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);
    container.style.columnGap = "0px";

    for (let i = 0; i < 4; i++) {
      const card = document.createElement("div");
      card.className = "judoka-card";
      Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
      container.appendChild(card);
    }

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 400, configurable: true });

    addScrollMarkers(container, wrapper);

    const markersRoot = wrapper.querySelector(".scroll-markers");
    expect(markersRoot).not.toBeNull();

    const markers = Array.from(markersRoot.querySelectorAll(".scroll-marker"));

    expect(markers[0].classList.contains("active")).toBe(true);
    expect(markers[1].classList.contains("active")).toBe(false);

    container.scrollLeft = container.scrollWidth - container.clientWidth;
    container.dispatchEvent(new Event("scroll"));

    expect(markers[0].classList.contains("active")).toBe(false);
    expect(markers[1].classList.contains("active")).toBe(true);

    container.scrollLeft = 0;
    container.dispatchEvent(new Event("scroll"));

    expect(markers[0].classList.contains("active")).toBe(true);
    expect(markers[1].classList.contains("active")).toBe(false);
  });

  it("updates the counter text as the page changes", () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);
    container.style.columnGap = "0px";

    for (let i = 0; i < 4; i++) {
      const card = document.createElement("div");
      card.className = "judoka-card";
      Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
      container.appendChild(card);
    }

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 400, configurable: true });

    addScrollMarkers(container, wrapper);

    const markersRoot = wrapper.querySelector(".scroll-markers");
    expect(markersRoot).not.toBeNull();

    const counter = markersRoot?.querySelector(".page-counter");
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toBe("Page 1 of 2");

    container.scrollLeft = container.scrollWidth - container.clientWidth;
    container.dispatchEvent(new Event("scroll"));

    expect(counter?.textContent).toBe("Page 2 of 2");
  });
});

describe("initScrollMarkers", () => {
  it("falls back to scheduler timeouts when requestAnimationFrame is missing", () => {
    timers = useCanonicalTimers();
    globalThis.requestAnimationFrame = undefined;

    const fallbackScheduler = {
      setTimeout: vi.fn((cb, ms) => setTimeout(cb, ms)),
      clearTimeout: vi.fn((id) => clearTimeout(id))
    };
    setScheduler(fallbackScheduler);

    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);
    container.style.columnGap = "0px";

    const card = document.createElement("div");
    card.className = "judoka-card";
    Object.defineProperty(card, "offsetWidth", { value: 100, configurable: true });
    container.appendChild(card);

    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });

    initScrollMarkers(container, wrapper);

    expect(fallbackScheduler.setTimeout).toHaveBeenCalledTimes(1);
    expect(fallbackScheduler.setTimeout.mock.calls[0][1]).toBe(0);
    expect(wrapper.querySelector(".scroll-markers")).toBeNull();

    vi.runAllTimers();

    const markersRoot = wrapper.querySelector(".scroll-markers");
    expect(markersRoot).not.toBeNull();
  });
});
