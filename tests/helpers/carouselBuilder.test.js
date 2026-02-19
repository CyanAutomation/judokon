import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

vi.mock("../../src/helpers/carousel/index.js", async () => {
  const actual = await vi.importActual("../../src/helpers/carousel/index.js");
  return {
    ...actual,
    appendCards: vi.fn((container, list) => {
      list.forEach(() => {
        const card = document.createElement("div");
        card.className = "judoka-card";
        container.appendChild(card);
      });
      return { ready: Promise.resolve() };
    }),
    setupResponsiveSizing: vi.fn(() => vi.fn())
  };
});

import { buildCardCarousel } from "../../src/helpers/carouselBuilder.js";
import { setupResponsiveSizing } from "../../src/helpers/carousel/index.js";

describe("buildCardCarousel", () => {
  it("returns message when judoka list is empty", async () => {
    const wrapper = await withMutedConsole(() => buildCardCarousel([], []));
    expect(wrapper.textContent).toContain("No cards available.");
  });

  it("invokes responsive sizing disposer during carousel teardown", async () => {
    const disposeResponsiveSizing = vi.fn();
    setupResponsiveSizing.mockReturnValueOnce(disposeResponsiveSizing);

    const wrapper = await withMutedConsole(() =>
      buildCardCarousel([{ id: 1 }, { id: 2 }, { id: 3 }], [])
    );

    wrapper._disposeCarousel();

    expect(disposeResponsiveSizing).toHaveBeenCalledTimes(1);
    expect(wrapper._carouselController).toBeNull();
    expect(wrapper._disposeResponsiveSizing).toBeNull();
  });

  it("updates scroll button state on scroll", async () => {
    const wrapper = await withMutedConsole(() =>
      buildCardCarousel([{ id: 1 }, { id: 2 }, { id: 3 }], [])
    );

    const container = wrapper.querySelector(".card-carousel");
    const [leftBtn, rightBtn] = wrapper.querySelectorAll(".scroll-button");

    Object.defineProperty(container, "clientWidth", { value: 100, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 300, configurable: true });

    container.scrollLeft = 0;
    container.dispatchEvent(new Event("scroll"));
    expect(leftBtn.disabled).toBe(true);
    expect(rightBtn.disabled).toBe(false);

    container.scrollLeft = 200;
    container.dispatchEvent(new Event("scroll"));
    expect(leftBtn.disabled).toBe(false);
    expect(rightBtn.disabled).toBe(true);
  });
});
