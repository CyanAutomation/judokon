import { describe, it, expect, afterEach, vi } from "vitest";

import * as cardRender from "../../src/helpers/cardRender.js";
import { createScrollButton } from "../../src/helpers/carousel/scroll.js";
import { generateJudokaCardHTML } from "../../src/helpers/cardBuilder.js";
// Remove this line - functions already available via cardRender import
import { withMutedConsole } from "../utils/console.js";
import { naturalClick } from "../utils/componentTestUtils.js";

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

const VALID_JUDOKA = {
  id: 1,
  firstname: "Jane",
  surname: "Doe",
  country: "USA",
  countryCode: "us",
  stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
  weightClass: "-63kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "female"
};

const GOKYO_LOOKUP = { 1: { id: 1, name: "Ouchi-gari" } };

const parseHtmlFragment = (html) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  return wrapper;
};

describe("generateJudokaCardHTML", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws error when required fields are missing", async () => {
    const incomplete = { ...VALID_JUDOKA };
    delete incomplete.countryCode;
    await expect(generateJudokaCardHTML(incomplete, GOKYO_LOOKUP)).rejects.toThrow(
      /Missing required fields/
    );
  });

  it("renders structured markup for the judoka card", async () => {
    const container = await generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP);

    expect(container.classList.contains("card-container")).toBe(true);
    expect(container.dataset.cardJson).toBeDefined();
    expect(() => JSON.parse(container.dataset.cardJson ?? "{}")).not.toThrow();

    const card = container.querySelector(".judoka-card");
    expect(card).toBeTruthy();
    expect(card.classList.contains("common")).toBe(true);
    expect(card.classList.contains("female-card")).toBe(true);

    const topBar = card?.querySelector(".card-top-bar");
    expect(topBar).toBeTruthy();
    const firstname = topBar?.querySelector(".card-name .firstname");
    expect(firstname?.textContent).toBe("Jane");
    const surname = topBar?.querySelector(".card-name .surname");
    expect(surname?.textContent).toBe("Doe");

    const weightClass = card?.querySelector(".card-weight-class");
    expect(weightClass?.textContent).toBe("-63kg");
    expect(weightClass?.dataset.tooltipId).toBe("card.weightClass");

    const stats = card?.querySelector(".card-stats");
    expect(stats).toBeTruthy();
    expect(stats?.classList.contains("common")).toBe(true);
    const statItems = stats?.querySelectorAll("li.stat");
    expect(statItems?.length).toBe(5);

    const signature = card?.querySelector(".signature-move-container");
    expect(signature).toBeTruthy();
    expect(signature?.classList.contains("common")).toBe(true);
    expect(signature?.dataset.tooltipId).toBe("ui.signatureBar");
    expect(signature?.querySelector(".signature-move-label")?.textContent).toBe("Signature Move:");
    expect(signature?.querySelector(".signature-move-value")?.textContent).toBe("Ouchi-gari");

    expect(container.querySelector(".debug-panel")).toBeNull();
  });

  it("exposes inspector metadata without enabling the inspector panel", async () => {
    const container = await generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP, {
      enableInspector: false
    });

    expect(container.dataset.inspector).toBeUndefined();
    expect(container.hasAttribute("data-inspector")).toBe(false);
    expect(container.querySelector(".debug-panel")).toBeNull();
    expect(container.dataset.cardJson).toBeDefined();

    const parsed = JSON.parse(container.dataset.cardJson ?? "{}");
    expect(parsed.firstname).toBe("Jane");
    expect(parsed.signatureMoveId).toBe(1);
  });

  it("renders fallback sections when a card section fails to build", async () => {
    vi.spyOn(cardRender, "generateCardPortrait").mockImplementation(() => {
      throw new Error("portrait failure");
    });
    vi.spyOn(cardRender, "generateCardStats").mockRejectedValue(new Error("stats failure"));
    vi.spyOn(cardRender, "generateCardSignatureMove").mockImplementation(() => {
      throw new Error("signature failure");
    });

    const container = await withMutedConsole(() =>
      generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP)
    );

    const card = container.querySelector(".judoka-card");
    expect(card).toBeTruthy();
    expect(card?.querySelector(".card-portrait")).toBeNull();
    expect(card?.querySelector(".card-stats")).toBeNull();
    expect(card?.querySelector(".signature-move-container")).toBeNull();

    const fallbackSections = Array.from(card?.children ?? []).slice(1);
    expect(fallbackSections).toHaveLength(3);
    fallbackSections.forEach((section) => {
      expect(section.classList.contains("card-top-bar")).toBe(true);
      expect(section.textContent).toContain("No data available");
    });
  });

  it("toggles inspector dataset on panel toggle", async () => {
    const container = await generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP, {
      enableInspector: true
    });
    const panel = container.querySelector(".debug-panel");
    const summary = panel?.querySelector("summary");
    expect(panel).toBeTruthy();
    expect(summary).toBeTruthy();
    expect(container.dataset.inspector).toBeUndefined();
    naturalClick(summary);
    await Promise.resolve();
    expect(container.dataset.inspector).toBe("true");
    naturalClick(summary);
    await Promise.resolve();
    expect(container.dataset.inspector).toBeUndefined();
  });
});

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

  it("createScrollButton returns left button with correct class and content", () => {
    const button = createScrollButton("left", container);
    expect(button.className).toBe("scroll-button left");
    expect(button).toHaveAttribute("aria-label", "Prev.");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(button.querySelector("span")?.textContent).toBe("Prev.");
  });

  it("createScrollButton returns right button with correct class and content", () => {
    const button = createScrollButton("right", container);
    expect(button.className).toBe("scroll-button right");
    expect(button).toHaveAttribute("aria-label", "Next");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(button.querySelector("span")?.textContent).toBe("Next");
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
  it("generateCardStats returns structured stats markup", async () => {
    const card = {
      stats: { power: 9, speed: 6, technique: 7, kumikata: 7, newaza: 8 }
    };

    const result = await generateCardStats(card);
    const wrapper = parseHtmlFragment(result);
    const statsContainer = wrapper.querySelector(".card-stats");
    expect(statsContainer).toBeTruthy();
    expect(statsContainer).toHaveAttribute("aria-label", "Judoka Stats");
    expect(statsContainer?.classList.contains("common")).toBe(true);

    const statItems = statsContainer?.querySelectorAll("li.stat");
    expect(statItems?.length).toBe(5);
    const firstLabel = statItems?.[0].querySelector("strong");
    const firstValue = statItems?.[0].querySelector("span");
    expect(firstLabel?.dataset.tooltipId).toBe("stat.power");
    expect(firstLabel?.textContent).toBe("Power");
    expect(firstValue?.textContent).toBe("9");
  });

  it("generateCardStats handles missing stats gracefully", async () => {
    const card = { stats: {} };
    const result = await generateCardStats(card);
    const wrapper = parseHtmlFragment(result);
    expect(wrapper.querySelector(".card-stats")).toBeTruthy();
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
    const wrapper = parseHtmlFragment(result);
    const statLabels = wrapper.querySelectorAll(".stat strong");
    expect(statLabels.length).toBeGreaterThan(0);
    expect(statLabels[0].textContent).toBe("Power");
    expect(wrapper.querySelector(".stat span")?.textContent).toBe("5");
  });

  it("generateCardStats escapes HTML in stat values", async () => {
    const card = { stats: { power: "<b>9</b>", speed: 6, technique: 7, kumikata: 7, newaza: 8 } };
    const result = await generateCardStats(card);
    const wrapper = parseHtmlFragment(result);
    const firstValue = wrapper.querySelector(".stat span");
    expect(firstValue?.innerHTML).toBe("&lt;b&gt;9&lt;/b&gt;");
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
    const wrapper = parseHtmlFragment(result);
    const image = wrapper.querySelector("img");
    expect(image?.getAttribute("loading")).toBe("lazy");
  });

  it("generateCardPortrait escapes HTML in firstname and surname", () => {
    const card = { id: 1, firstname: "<John>", surname: '"Doe"' };
    const result = generateCardPortrait(card);
    const wrapper = parseHtmlFragment(result);
    const name = wrapper.querySelector(".card-name");
    expect(name?.innerHTML).toContain("&lt;John&gt;");
    expect(name?.innerHTML).toContain("&quot;Doe&quot;");
  });

  it("generateCardPortrait includes alt attribute with full name", () => {
    const card = { id: 1, firstname: "Jane", surname: "Smith" };
    const result = generateCardPortrait(card);
    const wrapper = parseHtmlFragment(result);
    const image = wrapper.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("Jane Smith");
  });

  it("generateCardPortrait uses placeholder src and stores real portrait in data attribute", () => {
    const card = { id: 5, firstname: "Joe", surname: "Bloggs" };
    const result = generateCardPortrait(card);
    const wrapper = parseHtmlFragment(result);
    const image = wrapper.querySelector("img");
    expect(image?.getAttribute("src")).toBe("../assets/judokaPortraits/judokaPortrait-1.png");
    expect(image?.getAttribute("data-portrait-src")).toBe(
      "../assets/judokaPortraits/judokaPortrait-5.png"
    );
  });
});
