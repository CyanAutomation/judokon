import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/helpers/carousel/index.js", async () => {
  const actual = await vi.importActual("../../src/helpers/carousel/index.js");
  return {
    ...actual,
    appendCards: vi.fn(async (container, list) => {
      list.forEach(() => {
        const card = document.createElement("div");
        card.className = "judoka-card";
        container.appendChild(card);
      });
    }),
    setupResponsiveSizing: vi.fn()
  };
});

import { buildCardCarousel } from "../../src/helpers/carouselBuilder.js";

describe("buildCardCarousel", () => {
  it("returns message when judoka list is empty", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await buildCardCarousel([], []);
    errorSpy.mockRestore();
    expect(wrapper.textContent).toContain("No cards available.");
  });

  it("updates scroll button state on scroll", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await buildCardCarousel([{ id: 1 }, { id: 2 }, { id: 3 }], []);
    warnSpy.mockRestore();
    errorSpy.mockRestore();

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
