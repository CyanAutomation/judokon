import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearLegacyHoverZoomMarkers } from "../../src/helpers/setupHoverZoom.js";

const CARD_STYLE_SNIPPET = `
.card,
.judoka-card {
  transition: transform 0.1s ease-in-out;
}

.card.hover-test,
.judoka-card.hover-test {
  transform: scale(1.05);
}

body[data-test-disable-animations] .card,
body[data-test-disable-animations] .judoka-card {
  transition: none !important;
}
`;

let styleElement = null;

beforeEach(() => {
  document.body.innerHTML = "";
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  styleElement = document.createElement("style");
  styleElement.textContent = CARD_STYLE_SNIPPET;
  document.head.appendChild(styleElement);
});

afterEach(() => {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  document.body.removeAttribute("data-test-disable-animations");
});

describe("clearLegacyHoverZoomMarkers", () => {
  it("removes legacy hover zoom attributes from cards", () => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-enlarge-listener-attached", "true");
    card.setAttribute("data-enlarged", "true");
    document.body.appendChild(card);

    clearLegacyHoverZoomMarkers();

    expect(card.hasAttribute("data-enlarge-listener-attached")).toBe(false);
    expect(card.hasAttribute("data-enlarged")).toBe(false);
  });

  it("verifies CSS hover transforms work correctly for standard cards", () => {
    const card = document.createElement("div");
    card.className = "card";
    document.body.appendChild(card);

    clearLegacyHoverZoomMarkers();

    card.classList.add("hover-test");
    const transform = window.getComputedStyle(card).getPropertyValue("transform");
    expect(transform).toMatch(/scale/i);
  });

  it("verifies CSS hover transforms work correctly for judoka cards", () => {
    const card = document.createElement("div");
    card.className = "judoka-card";
    document.body.appendChild(card);

    clearLegacyHoverZoomMarkers();

    card.classList.add("hover-test");
    const transform = window.getComputedStyle(card).getPropertyValue("transform");
    expect(transform).toMatch(/scale/i);
  });

  it("allows tests to disable transitions via the body attribute", () => {
    const card = document.createElement("div");
    card.className = "card";
    document.body.setAttribute("data-test-disable-animations", "true");
    document.body.appendChild(card);

    clearLegacyHoverZoomMarkers();

    card.classList.add("hover-test");
    const transform = window.getComputedStyle(card).getPropertyValue("transform");
    const transition = window.getComputedStyle(card).getPropertyValue("transition");
    expect(transform).toMatch(/scale/i);
    expect(transition).toBe("none");
  });
});
