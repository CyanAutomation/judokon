import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestCarousel } from "../utils/componentTestUtils.js";
import { clearLegacyHoverZoomMarkers } from "../../src/helpers/setupHoverZoom.js";

const CARD_STYLE_SNIPPET = `
.card,
.judoka-card {
  transition: transform 0.1s ease-in-out;
}

.card.hover-test,
.judoka-card.hover-test,
.card:focus,
.judoka-card:focus {
  transform: scale(1.05);
}

body[data-test-disable-animations] .card,
body[data-test-disable-animations] .judoka-card {
  transition: none !important;
}
`;

let styleElement = null;
let cleanupTasks = [];

function renderCarouselCard(className = "card") {
  const { element: carousel, testApi } = createTestCarousel();
  const card = document.createElement("div");
  card.className = className;
  card.tabIndex = 0;
  carousel.appendChild(card);
  document.body.appendChild(carousel);

  cleanupTasks.push(() => {
    try {
      testApi.cleanup();
    } catch (error) {
      console.warn('Cleanup task failed:', error);
    }
  });

  return { card };
}

beforeEach(() => {
  document.body.innerHTML = "";
  cleanupTasks = [];
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  styleElement = document.createElement("style");
  styleElement.textContent = CARD_STYLE_SNIPPET;
  document.head.appendChild(styleElement);
});

afterEach(() => {
  cleanupTasks.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.warn('Cleanup task failed:', error);
    }
  });
  cleanupTasks = [];
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  document.body.removeAttribute("data-test-disable-animations");
});

describe("clearLegacyHoverZoomMarkers", () => {
  it("removes legacy markers while keeping zoom affordance on class toggle", () => {
    const { card } = renderCarouselCard();
    card.setAttribute("data-enlarge-listener-attached", "true");
    card.setAttribute("data-enlarged", "true");

    clearLegacyHoverZoomMarkers();

    expect(card.hasAttribute("data-enlarge-listener-attached")).toBe(false);
    expect(card.hasAttribute("data-enlarged")).toBe(false);

    card.classList.add("hover-test");
    const transform = window.getComputedStyle(card).getPropertyValue("transform");
    expect(transform).toMatch(/scale/i);
  });

  it("honors reduced motion hints and keyboard focus on carousel cards", () => {
    document.body.setAttribute("data-test-disable-animations", "true");
    const { card } = renderCarouselCard("judoka-card");

    clearLegacyHoverZoomMarkers();

    card.focus();
    card.classList.add("hover-test");
    const styles = window.getComputedStyle(card);
    expect(document.activeElement).toBe(card);
    expect(styles.getPropertyValue("transform")).toMatch(/scale/i);
    expect(styles.getPropertyValue("transition")).toBe("none");
  });
});
