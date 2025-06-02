import { createScrollButton } from "../../helpers/carouselBuilder.js";
import { generateCardPortrait, generateCardStats } from "../../helpers/cardRender.js";
import { vi } from "vitest";

// Utility to normalize HTML for comparison
const ///**
 * Description.
 * @param {any} html
 * @returns {any}
 */
normalizeHtml = html => html.replace(/\s+/g, " ").trim();
describe("createScrollButton", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    container.style.overflow = "hidden";
    container.style.width = "200px";
    container.innerHTML = '<div style="width: 1000px;">Content</div>';
    container.scrollLeft = 0;
    container.scrollBy = vi.fn(({
      left
    }) => {
      container.scrollLeft += left;
    });
  });
  it("should create a scroll button with the correct class and inner HTML when direction is left", () => {
    const button = createScrollButton("left", container, 100);
    expect(button.className).toBe("scroll-button left");
    expect(button.innerHTML).toBe("&lt;");
  });
  it("should create a scroll button with the correct class and inner HTML when direction is right", () => {
    const button = createScrollButton("right", container, 100);
    expect(button.className).toBe("scroll-button right");
    expect(button.innerHTML).toBe("&gt;");
  });
  it("should throw an error when the direction is invalid", () => {
    expect(() => createScrollButton("up", container, 100)).toThrowError("Invalid direction");
  });
  it("should scroll the container to the left when clicked", () => {
    const button = createScrollButton("left", container, 100);
    button.click();
    expect(container.scrollLeft).toBe(-100);
  });
  it("should scroll the container to the right when clicked", () => {
    const button = createScrollButton("right", container, 100);
    button.click();
    expect(container.scrollLeft).toBe(100);
  });
  it("should throw an error if container is null", () => {
    expect(() => createScrollButton("left", null, 100)).toThrowError("Container is required");
  });
});
describe("generateCardStats", () => {
  it("should return a valid HTML string for a judoka's stats", () => {
    const card = {
      stats: {
        power: 9,
        speed: 6,
        technique: 7,
        kumikata: 7,
        newaza: 8
      }
    };
    const expectedHtml = `
      <div class="card-stats common">
        <ul>
          <li class="stat"><strong>Power</strong> <span>9</span></li>
          <li class="stat"><strong>Speed</strong> <span>6</span></li>
          <li class="stat"><strong>Technique</strong> <span>7</span></li>
          <li class="stat"><strong>Kumi-kata</strong> <span>7</span></li>
          <li class="stat"><strong>Ne-waza</strong> <span>8</span></li>
        </ul>
      </div>
    `;
    const result = generateCardStats(card);
    expect(normalizeHtml(result)).toBe(normalizeHtml(expectedHtml));
  });
  it("should handle missing stats gracefully", () => {
    const card = {
      stats: {}
    };
    const result = generateCardStats(card);
    expect(result).toContain('<div class="card-stats common">');
  });
  it("should throw an error if stats object is missing", () => {
    const card = {};
    expect(() => generateCardStats(card)).toThrowError("Stats object is required");
  });
  it("should throw an error if stats is null", () => {
    const card = {
      stats: null
    };
    expect(() => generateCardStats(card)).toThrowError("Stats object is required");
  });
  it("should throw an error if stats is undefined", () => {
    const card = {
      stats: undefined
    };
    expect(() => generateCardStats(card)).toThrowError("Stats object is required");
  });
  it("should throw an error if card is null", () => {
    expect(() => generateCardStats(null)).toThrowError("Card object is required");
  });
  it("should throw an error if card is undefined", () => {
    expect(() => generateCardStats(undefined)).toThrowError("Card object is required");
  });
});
describe("generateCardPortrait", () => {
  it("should throw an error if card is null", () => {
    expect(() => generateCardPortrait(null)).toThrowError("Card object is required");
  });
  it("should throw an error if card is undefined", () => {
    expect(() => generateCardPortrait(undefined)).toThrowError("Card object is required");
  });
});