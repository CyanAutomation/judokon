import { createScrollButton } from "../../helpers/carouselBuilder.js";

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
    const scrollAmount = 100;
    const button = createScrollButton(direction, container, scrollAmount);

    button.click();
    expect(container.scrollLeft).toBe(-100);
  });

  it("should handle edge cases gracefully when container is null", () => {
    const direction = "left";
    const scrollAmount = 100;
    expect(() => createScrollButton(direction, null, scrollAmount)).toThrowError(
      "Container is required"
    );
  });
});

describe("generateCardPortrait", () => {
  it("should return a valid HTML string for a judoka's portrait", () => {
    const card = { id: 0, firstname: "John", surname: "Doe" };
    const expectedHtml = `
        <div class="card-portrait">
          <img src="../assets/judokaPortraits/judokaPortrait-0.png" alt="John Doe's portrait" onerror="this.src='../assets/judokaPortraits/judokaPortrait-0.png'">
        </div>
      `;

    const result = generateCardPortrait(card);

    const normalizeHtml = (html) => html.replace(/\s+/g, " ").trim();
    expect(normalizeHtml(result)).toBe(normalizeHtml(expectedHtml));
  });

  it("should throw an error or handle gracefully if card is missing required fields", () => {
    const card = {}; // Incomplete data
    expect(() => generateCardPortrait(card)).toThrow();
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
});
