import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createButton } from "./components/Button.js";
import { createSimpleHarness } from "./integrationHarness.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockPopulateCountryList } = vi.hoisted(() => ({
  mockPopulateCountryList: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/country/list.js", () => ({
  populateCountryList: mockPopulateCountryList
}));

describe("createCountrySlider", () => {
  let harness;

  beforeEach(async () => {
    mockPopulateCountryList.mockReset().mockImplementation(async (c) => {
      const slideA = createButton("Slide A", { className: "slide" });
      const slideB = createButton("Slide B", { className: "slide" });
      c.appendChild(slideA.element);
      c.appendChild(slideB.element);
    });

    harness = createSimpleHarness();
    await harness.setup();
  });

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
    }
  });

  it("renders flag buttons using populateCountryList", async () => {
    const track = document.createElement("div");
    const mockJudokaData = [
      { id: 1, country: "Japan", countryCode: "jp" },
      { id: 2, country: "Brazil", countryCode: "br" }
    ];

    const { createCountrySlider } = await harness.importModule(
      "../../src/helpers/countrySlider.js"
    );

    await createCountrySlider(track, mockJudokaData);

    expect(mockPopulateCountryList).toHaveBeenCalledWith(track, mockJudokaData);
    const slides = track.querySelectorAll(".slide");
    expect(slides).toHaveLength(2);
  });
});
