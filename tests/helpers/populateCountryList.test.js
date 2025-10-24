import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createPopulateCountryListHarness } from "./integrationHarness.js";

vi.mock("../../src/helpers/api/countryService.js", () => ({
  loadCountryMapping: vi.fn(),
  getFlagUrl: vi.fn()
}));

import { loadCountryMapping, getFlagUrl } from "../../src/helpers/api/countryService.js";

const harness = createPopulateCountryListHarness();

beforeEach(async () => {
  getFlagUrl.mockImplementation((code) => `https://flagcdn.com/w320/${code}.png`);
  await harness.setup();
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("populateCountryList", () => {
  it("renders countries found in judoka.json alphabetically", async () => {
    const judoka = [
      { id: 1, firstname: "A", surname: "B", country: "Japan" },
      { id: 2, firstname: "C", surname: "D", country: "Brazil" },
      { id: 3, firstname: "E", surname: "F", country: "Japan" }
    ];

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));

    const mapping = {
      br: { country: "Brazil", code: "br", active: true },
      ca: { country: "Canada", code: "ca", active: true },
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const labels = container.querySelectorAll("label.flag-button");
    const names = [...labels].map((s) => s.querySelector("p").textContent);
    expect(names).toEqual(["All", "Brazil", "Japan"]);
    const radios = container.querySelectorAll('input[type="radio"][name="country-filter"]');
    expect(radios[0].checked).toBe(true);
  });

  it("places country filter radios before their buttons for native keyboard navigation", async () => {
    const judoka = [
      { id: 1, firstname: "A", surname: "B", country: "Japan" },
      { id: 2, firstname: "C", surname: "D", country: "Brazil" }
    ];

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));

    const mapping = {
      br: { country: "Brazil", code: "br", active: true },
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const fieldset = container.querySelector("fieldset.country-filter-group");
    expect(fieldset).not.toBeNull();

    const radios = fieldset?.querySelectorAll('input[type="radio"][name="country-filter"]') ?? [];
    expect(radios.length).toBeGreaterThan(0);

    radios.forEach((radio) => {
      const sibling = radio.nextElementSibling;
      expect(sibling).toBeInstanceOf(HTMLLabelElement);
      expect(sibling?.getAttribute("for")).toBe(radio.id);
    });
  });

  it("applies accessible aria-labels to flag buttons", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));

    const mapping = {
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const radios = container.querySelectorAll('input[type="radio"][name="country-filter"]');
    expect(radios[0]).toHaveAttribute("aria-label", "Show all countries");
    expect(radios[1]).toHaveAttribute("aria-label", "Filter by Japan");
  });

  it("adds lazy loading to flag images", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));

    const mapping = {
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const images = container.querySelectorAll("img.flag-image");
    images.forEach((img) => {
      expect(img.getAttribute("loading")).toBe("lazy");
    });
  });

  it("lazy loads country batches on scroll", async () => {
    const judoka = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      firstname: "A",
      surname: "B",
      country: `Country${i}`
    }));

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));

    const codeMap = new Map(
      judoka.map((j, i) => {
        const code =
          String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26));
        return [j.country, code];
      })
    );

    const mapping = {};
    for (const [country, code] of codeMap) {
      mapping[code] = { country, code, active: true };
    }
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList, loadNextCountryBatch } = await import(
      "../../src/helpers/country/list.js"
    );

    const track = document.createElement("div");
    const scrollContainer = document.createElement("div");
    scrollContainer.appendChild(track);

    Object.defineProperty(scrollContainer, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(scrollContainer, "scrollHeight", { value: 200, configurable: true });
    scrollContainer.scrollTop = 0;

    await populateCountryList(track);

    expect(track.querySelectorAll(".slide").length).toBe(51);

    await loadNextCountryBatch(track);

    expect(track.querySelectorAll(".slide").length).toBe(61);
  });

  it("handles fetch failure gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockRejectedValue(new Error("network error"))
    }));
    loadCountryMapping.mockResolvedValue({});

    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");

    await expect(populateCountryList(container)).resolves.toBeUndefined();
    expect(container.querySelectorAll(".slide").length).toBe(0);

    consoleErrorSpy.mockRestore();
  });

  it("does not duplicate countries if mapping has duplicates", async () => {
    const judoka = [
      { id: 1, firstname: "A", surname: "B", country: "Japan" },
      { id: 2, firstname: "C", surname: "D", country: "Japan" }
    ];
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));
    const mapping = {
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    // Should only have "All" and "Japan"
    expect(names).toEqual(["All", "Japan"]);
  });

  it("renders 'No countries available.' when no active countries exist", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue([])
    }));
    loadCountryMapping.mockResolvedValue({});
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    expect(container.textContent).toBe("No countries available.");
    expect(container.querySelectorAll(".slide").length).toBe(0);
  });
});
