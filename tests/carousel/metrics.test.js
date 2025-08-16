import { describe, it, expect, beforeEach } from "vitest";
import { getPageMetrics } from "../../src/helpers/carousel/metrics.js";

function makeCard(width) {
  const card = document.createElement("div");
  card.className = "judoka-card";
  Object.defineProperty(card, "offsetWidth", { value: width, configurable: true });
  return card;
}

function setClientWidth(el, width) {
  Object.defineProperty(el, "clientWidth", { value: width, configurable: true });
}

describe("getPageMetrics", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    container.className = "card-carousel";
  });

  it("computes 1 card per page on narrow container", () => {
    // Given: 6 cards, card width 200, container 320, gap 16
    for (let i = 0; i < 6; i++) container.appendChild(makeCard(200));
    setClientWidth(container, 320);
    container.style.columnGap = "16px";

    const m = getPageMetrics(container);
    expect(m.cardsPerPage).toBe(1);
    expect(m.pageCount).toBe(6);
    expect(m.pageWidth).toBe(216); // 1 * (card + gap)
  });

  it("computes 2 cards per page on medium container", () => {
    for (let i = 0; i < 6; i++) container.appendChild(makeCard(220));
    setClientWidth(container, 500);
    container.style.columnGap = "20px";

    const m = getPageMetrics(container);
    expect(m.cardsPerPage).toBe(2);
    expect(m.pageCount).toBe(3);
    expect(m.pageWidth).toBe(480); // 2 * (card + gap)
  });
});
