import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

vi.mock("../../src/helpers/api/countryService.js", () => ({
  loadCountryMapping: vi.fn(),
  getFlagUrl: vi.fn()
}));

import { loadCountryMapping, getFlagUrl } from "../../src/helpers/api/countryService.js";

beforeEach(() => {
  getFlagUrl.mockImplementation((code) => `https://flagcdn.com/w320/${code}.png`);
});

afterEach(() => {
  vi.resetModules();
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
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

    const mapping = {
      br: { country: "Brazil", code: "br", active: true },
      ca: { country: "Canada", code: "ca", active: true },
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    expect(names).toEqual(["All", "Brazil", "Japan"]);
  });

  it("applies accessible aria-labels to flag buttons", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

    const mapping = {
      jp: { country: "Japan", code: "jp", active: true }
    };
    loadCountryMapping.mockResolvedValue(mapping);

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const buttons = container.querySelectorAll("button.flag-button");
    expect(buttons[0]).toHaveAttribute("aria-label", "Show all countries");
    expect(buttons[1]).toHaveAttribute("aria-label", "Filter by Japan");
  });

  it("adds lazy loading to flag images", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(judoka)
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

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
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

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
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
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
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
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
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
    loadCountryMapping.mockResolvedValue({});
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    expect(container.textContent).toBe("No countries available.");
    expect(container.querySelectorAll(".slide").length).toBe(0);
  });
});
