import { createScrollButton } from "../../helpers/carouselBuilder.js";
import { generateCardPortrait, generateCardStats } from "../../helpers/cardRender.js";
import { vi } from "vitest";

describe("createScrollButton", () => {
  it("should create a scroll button with the correct class and inner HTML when direction is left", () => {
    const direction = "left";
    const container = document.createElement("div");
    const scrollAmount = 100;
    const button = createScrollButton(direction, container, scrollAmount);
    expect(button.className).toBe("scroll-button left");
    expect(button.innerHTML).toBe("&lt;");
  });

  it("should create a scroll button with the correct class and inner HTML when direction is right", () => {
    const direction = "right";
    const container = document.createElement("div");
    const scrollAmount = 100;
    const button = createScrollButton(direction, container, scrollAmount);
    expect(button.className).toBe("scroll-button right");
    expect(button.innerHTML).toBe("&gt;");
  });

  it("should throw an error when the direction is invalid", () => {
    const direction = "up";
    const container = document.createElement("div");
    const scrollAmount = 100;
    expect(() => createScrollButton(direction, container, scrollAmount)).toThrowError(
      "Invalid direction"
    );
  });

  it("should attach a click event listener to scroll the container", () => {
    const direction = "left";
    const container = document.createElement("div");
    container.style.overflow = "hidden";
    container.style.width = "200px";
    container.innerHTML = '<div style="width: 1000px;">Content</div>';
    container.scrollLeft = 0;
    const scrollAmount = 100;

    // Mock scrollBy
    container.scrollBy = vi.fn(({ left }) => {
      container.scrollLeft += left;
    });

    const button = createScrollButton(direction, container, scrollAmount);

    button.click();
    expect(container.scrollLeft).toBe(-100);
  });

  it("should correctly scroll the container to the right", () => {
    const direction = "right";
    const container = document.createElement("div");
    container.style.overflow = "hidden";
    container.style.width = "200px";
    container.innerHTML = '<div style="width: 1000px;">Content</div>';
    container.scrollLeft = 0;
    const scrollAmount = 100;

    // Mock scrollBy
    container.scrollBy = vi.fn(({ left }) => {
      container.scrollLeft += left;
    });

    const button = createScrollButton(direction, container, scrollAmount);

    button.click();
    expect(container.scrollLeft).toBe(100); // Test for right scroll
  });

  it("should handle edge cases gracefully when container is null", () => {
    const direction = "left";
    const scrollAmount = 100;
    expect(() => createScrollButton(direction, null, scrollAmount)).toThrowError(
      "Container is required"
    );
  });

  it("should not scroll the container if scrollAmount is zero", () => {
    const direction = "left";
    const container = document.createElement("div");
    container.style.overflow = "hidden";
    container.style.width = "200px";
    container.innerHTML = '<div style="width: 1000px;">Content</div>';
    container.scrollLeft = 0;
    const scrollAmount = 0;
    const button = createScrollButton(direction, container, scrollAmount);

    button.click();
    expect(container.scrollLeft).toBe(0);
  });
});

describe("generateCardPortrait", () => {
  it("should return a valid HTML string for a judoka's portrait", () => {
    const card = { id: 0, firstname: "John", surname: "Doe" }; // Ensure all required fields are present
    const expectedHtml = `
        <div class="card-portrait">
          <img src="../assets/judokaPortraits/judokaPortrait-0.png" alt="John Doe's portrait" onerror="this.src='../assets/judokaPortraits/judokaPortrait-0.png'">
        </div>
      `;

    const result = generateCardPortrait(card);

    const normalizeHtml = (html) => html.replace(/\s+/g, " ").trim();
    expect(normalizeHtml(result)).toBe(normalizeHtml(expectedHtml));
  });

  it("should throw an error if card is missing required fields", () => {
    const card = { id: 0 }; // Missing firstname and surname
    expect(() => generateCardPortrait(card)).toThrowError(
      "Card is missing required fields: firstname, surname"
    );
  });

  it("should handle gracefully if card is null or undefined", () => {
    expect(() => generateCardPortrait(null)).toThrowError("Card object is required");
    expect(() => generateCardPortrait(undefined)).toThrowError("Card object is required");
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

    const normalizeHtml = (html) => html.replace(/\s+/g, " ").trim();
    expect(normalizeHtml(result)).toBe(normalizeHtml(expectedHtml));
  });

  it("should handle missing stats gracefully", () => {
    const card = { stats: {} };
    const result = generateCardStats(card);
    expect(result).toContain('<div class="card-stats common">');
  });

  it("should throw an error if stats object is missing", () => {
    const card = {};
    expect(() => generateCardStats(card)).toThrowError("Stats object is required");
  });

  it("should handle null or undefined stats gracefully", () => {
    const card = { stats: null };
    const result = generateCardStats(card);
    expect(result).toContain('<div class="card-stats common">');
  });
});
