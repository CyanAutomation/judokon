import { describe, it, expect, beforeEach, vi } from "vitest";
import { addHoverZoomMarkers } from "../../src/helpers/setupHoverZoom.js";

beforeEach(() => {
  // Clean DOM between tests
  document.body.innerHTML = "";
  // Ensure no leftover matchMedia mock
  try {
    delete window.matchMedia;
  } catch {}
});

describe("addHoverZoomMarkers", () => {
  it("sets data-enlarged immediately when prefers-reduced-motion is true", () => {
    // Arrange: create a card element
    const card = document.createElement("div");
    card.className = "card";
    document.body.appendChild(card);

    // Mock matchMedia to simulate reduced motion
    window.matchMedia = vi.fn(() => ({ matches: true }));

    // Act
    addHoverZoomMarkers();
    // Simulate mouseenter
    card.dispatchEvent(new Event("mouseenter"));

    // Assert: dataset.enlarged should be set immediately
    expect(card.dataset.enlarged).toBe("true");
    // And the listener-attached marker should be present
    expect(card.dataset.enlargeListenerAttached).toBe("true");
  });

  it("marks enlarged after transitionend when not reduced-motion", () => {
    // Arrange: create a card element
    const card = document.createElement("div");
    card.className = "card";
    document.body.appendChild(card);

    // matchMedia -> not reduced
    window.matchMedia = vi.fn(() => ({ matches: false }));

    // Act: wire listeners
    addHoverZoomMarkers();

    // Precondition: dataset.enlarged should be undefined
    expect(card.dataset.enlarged).toBeUndefined();

    // Simulate mouseenter (should clear any enlarged marker)
    card.dataset.enlarged = "true";
    card.dispatchEvent(new Event("mouseenter"));
    expect(card.dataset.enlarged).toBeUndefined();

    // Simulate transitionend for transform property
    const evt = new Event("transitionend");
    // @ts-ignore - attach propertyName for testing
    evt.propertyName = "transform";
    card.dispatchEvent(evt);

    // Assert: dataset.enlarged should now be true
    expect(card.dataset.enlarged).toBe("true");
  });
});
