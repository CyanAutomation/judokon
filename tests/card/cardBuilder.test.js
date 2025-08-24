import { createScrollButton } from "../../src/helpers/carousel/scroll.js";
import { generateCardPortrait, generateCardStats } from "../../src/helpers/cardRender.js";

vi.mock("../../src/helpers/stats.js", () => ({
  loadStatNames: () =>
    Promise.resolve([
      { name: "Power" },
      { name: "Speed" },
      { name: "Technique" },
      { name: "Kumi-kata" },
      { name: "Ne-waza" }
    ])
}));
import { vi } from "vitest";

// Utility to normalize HTML for comparison
const normalizeHtml = (html) => html.replace(/\s+/g, " ").trim();

describe("createScrollButton", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.overflow = "hidden";
    container.style.width = "200px";
    container.innerHTML = '<div style="width: 1000px;">Content</div>';
    Object.defineProperty(container, "clientWidth", { value: 100, configurable: true });
    container.scrollLeft = 0;

    container.scrollBy = vi.fn(({ left }) => {
      container.scrollLeft += left;
    });
  });

  it("createScrollButton returns left button with correct class and inner HTML", () => {
    const button = createScrollButton("left", container);
    expect(button.className).toBe("scroll-button left");
    expect(button.innerHTML).toContain("<svg");
    expect(button.innerHTML).toContain("Prev.</span>");
    expect(button).toHaveAttribute("aria-label", "Prev.");
  });

  it("createScrollButton returns right button with correct class and inner HTML", () => {
    const button = createScrollButton("right", container);
    expect(button.className).toBe("scroll-button right");
    expect(button.innerHTML).toContain("<svg");
    expect(button.innerHTML).toContain("Next</span>");
    expect(button).toHaveAttribute("aria-label", "Next");
  });

  it("createScrollButton throws when direction is invalid", () => {
    expect(() => createScrollButton("up", container)).toThrowError("Invalid direction");
  });

  it("createScrollButton scrolls container to the left when clicked", () => {
    const button = createScrollButton("left", container);
    button.click();
    expect(container.scrollLeft).toBe(-100);
  });

  it("createScrollButton scrolls container to the right when clicked", () => {
    const button = createScrollButton("right", container);
    button.click();
    expect(container.scrollLeft).toBe(100);
  });

  it("createScrollButton throws when container is null", () => {
    expect(() => createScrollButton("left", null)).toThrowError("Container is required");
  });

  it("createScrollButton does not throw if scrollBy is not defined on container", () => {
    const div = document.createElement("div");
    expect(() => createScrollButton("left", div)).not.toThrow();
  });
});

describe("generateCardStats", () => {
  it("generateCardStats returns a valid HTML string for a judoka's stats", async () => {
    const card = {
      stats: { power: 9, speed: 6, technique: 7, kumikata: 7, newaza: 8 }
    };

    const expectedHtml =
      '<div class="card-stats common" aria-label="Judoka Stats"><ul>' +
      '<li class="stat"><strong data-tooltip-id="stat.power">Power</strong><span>9</span></li>' +
      '<li class="stat"><strong data-tooltip-id="stat.speed">Speed</strong><span>6</span></li>' +
      '<li class="stat"><strong data-tooltip-id="stat.technique">Technique</strong><span>7</span></li>' +
      '<li class="stat"><strong data-tooltip-id="stat.kumikata">Kumi-kata</strong><span>7</span></li>' +
      '<li class="stat"><strong data-tooltip-id="stat.newaza">Ne-waza</strong><span>8</span></li>' +
      "</ul></div>";

    const result = await generateCardStats(card);
    expect(normalizeHtml(result)).toBe(normalizeHtml(expectedHtml));
  });

  it("generateCardStats handles missing stats gracefully", async () => {
    const card = { stats: {} };
    const result = await generateCardStats(card);
    expect(result).toContain('<div class="card-stats common"');
  });

  it.each([
    ["stats object is missing", {}],
    ["stats is null", { stats: null }],
    ["stats is undefined", { stats: undefined }]
  ])("generateCardStats throws when %s", async (_, card) => {
    await expect(generateCardStats(card)).rejects.toThrowError("Stats object is required");
  });

  it.each([
    ["card is null", null],
    ["card is undefined", undefined]
  ])("generateCardStats throws when %s", async (_, card) => {
    await expect(generateCardStats(card)).rejects.toThrowError("Card object is required");
  });

  it("generateCardStats handles stats with missing keys gracefully", async () => {
    const card = { stats: { power: 5 } };
    const result = await generateCardStats(card);
    expect(result).toContain("Power");
    expect(result).toContain("5");
  });

  it("generateCardStats escapes HTML in stat values", async () => {
    const card = { stats: { power: "<b>9</b>", speed: 6, technique: 7, kumikata: 7, newaza: 8 } };
    const result = await generateCardStats(card);
    expect(result).toContain("&lt;b&gt;9&lt;/b&gt;");
  });
});

describe("generateCardPortrait", () => {
  it.each([
    ["card is null", null],
    ["card is undefined", undefined]
  ])("generateCardPortrait throws when %s", (_, card) => {
    expect(() => generateCardPortrait(card)).toThrowError("Card object is required");
  });

  it("generateCardPortrait includes loading attribute on the portrait image", () => {
    const card = { id: 1, firstname: "John", surname: "Doe" };
    const result = generateCardPortrait(card);
    expect(result).toContain('loading="lazy"');
  });

  it("generateCardPortrait escapes HTML in firstname and surname", () => {
    const card = { id: 1, firstname: "<John>", surname: '"Doe"' };
    const result = generateCardPortrait(card);
    expect(result).toContain("&lt;John&gt;");
    expect(result).toContain("&quot;Doe&quot;");
  });

  it("generateCardPortrait includes alt attribute with full name", () => {
    const card = { id: 1, firstname: "Jane", surname: "Smith" };
    const result = generateCardPortrait(card);
    expect(result).toContain('alt="Jane Smith"');
  });

  it("generateCardPortrait uses placeholder src and stores real portrait in data attribute", () => {
    const card = { id: 5, firstname: "Joe", surname: "Bloggs" };
    const result = generateCardPortrait(card);
    expect(result).toContain('src="../assets/judokaPortraits/judokaPortrait-1.png"');
    expect(result).toContain('data-portrait-src="../assets/judokaPortraits/judokaPortrait-5.png"');
  });
});
