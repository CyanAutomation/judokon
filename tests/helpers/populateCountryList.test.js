import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

const mockCountryUtils = {
  listCountries: vi.fn(),
  getCodeByCountry: vi.fn(),
  normalizeCode: vi.fn((c) => c?.toLowerCase())
};

vi.mock("../../src/utils/countryCodes.js", () => mockCountryUtils);

afterEach(() => {
  global.fetch = originalFetch;
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

    mockCountryUtils.listCountries.mockResolvedValue(["Brazil", "Canada", "Japan"]);
    const codes = { Brazil: "br", Canada: "ca", Japan: "jp" };
    mockCountryUtils.getCodeByCountry.mockImplementation(async (name) => codes[name]);

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => judoka });

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    expect(names).toEqual(["All", "Brazil", "Japan"]);
  });

  it("applies accessible aria-labels to flag buttons", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    mockCountryUtils.listCountries.mockResolvedValue(["Japan"]);
    mockCountryUtils.getCodeByCountry.mockResolvedValue("jp");

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => judoka });

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const buttons = container.querySelectorAll("button.flag-button");
    expect(buttons[0]).toHaveAttribute("aria-label", "Show all countries");
    expect(buttons[1]).toHaveAttribute("aria-label", "Filter by Japan");
  });

  it("adds lazy loading to flag images", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    mockCountryUtils.listCountries.mockResolvedValue(["Japan"]);
    mockCountryUtils.getCodeByCountry.mockResolvedValue("jp");

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => judoka });

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const images = container.querySelectorAll("img.flag-image");
    images.forEach((img) => {
      expect(img.getAttribute("loading")).toBe("lazy");
    });
  });

  it("lazy loads additional countries on scroll", async () => {
    const judoka = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      firstname: "A",
      surname: "B",
      country: `Country${i}`
    }));

    const codeMap = new Map(
      judoka.map((j, i) => {
        const code =
          String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26));
        return [j.country, code];
      })
    );

    mockCountryUtils.listCountries.mockResolvedValue(Array.from(codeMap.keys()).sort());
    mockCountryUtils.getCodeByCountry.mockImplementation(async (name) => codeMap.get(name));

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("judoka.json")) {
        return Promise.resolve({ ok: true, json: async () => judoka });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const track = document.createElement("div");
    const scrollContainer = document.createElement("div");
    scrollContainer.appendChild(track);

    Object.defineProperty(scrollContainer, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(scrollContainer, "scrollHeight", { value: 200, configurable: true });
    scrollContainer.scrollTop = 0;

    await populateCountryList(track);

    expect(track.querySelectorAll(".slide").length).toBe(51);

    scrollContainer.scrollTop = 200;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 0));

    expect(track.querySelectorAll(".slide").length).toBe(61);
  });

  it("handles fetch failure gracefully", async () => {
    mockCountryUtils.listCountries.mockResolvedValue([]);
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await expect(populateCountryList(container)).resolves.toBeUndefined();
    expect(container.querySelectorAll(".slide").length).toBe(0);
  });

  it("does not duplicate countries if mapping has duplicates", async () => {
    const judoka = [
      { id: 1, firstname: "A", surname: "B", country: "Japan" },
      { id: 2, firstname: "C", surname: "D", country: "Japan" }
    ];
    mockCountryUtils.listCountries.mockResolvedValue(["Japan"]);
    mockCountryUtils.getCodeByCountry.mockResolvedValue("jp");
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => judoka });
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    // Should only have "All" and "Japan"
    expect(names).toEqual(["All", "Japan"]);
  });

  it("shows a message if no countries are found", async () => {
    mockCountryUtils.listCountries.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    expect(container.textContent).toBe("No countries available.");
    expect(container.querySelectorAll(".slide").length).toBe(0);
  });
});
