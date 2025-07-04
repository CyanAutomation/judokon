import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  localStorage.clear();
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("populateCountryList", () => {
  it("renders countries found in judoka.json alphabetically", async () => {
    const judoka = [
      { id: 1, firstname: "A", surname: "B", country: "Japan" },
      { id: 2, firstname: "C", surname: "D", country: "Brazil" },
      { id: 3, firstname: "E", surname: "F", country: "Japan" }
    ];

    const mapping = [
      { country: "Japan", code: "jp", active: true },
      { country: "Brazil", code: "br", active: true },
      { country: "Canada", code: "ca", active: true }
    ];

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => judoka })
      .mockResolvedValueOnce({ ok: true, json: async () => mapping });

    const { populateCountryList } = await import("../../src/helpers/countryUtils.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    expect(names).toEqual(["All", "Brazil", "Japan"]);
  });

  it("lazy loads additional countries on scroll", async () => {
    const judoka = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      firstname: "A",
      surname: "B",
      country: `Country${i}`
    }));

    const mapping = judoka.map((j, i) => ({
      country: j.country,
      code: `c${i}`,
      active: true
    }));

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("judoka.json")) {
        return Promise.resolve({ ok: true, json: async () => judoka });
      }
      return Promise.resolve({ ok: true, json: async () => mapping });
    });

    const { populateCountryList } = await import("../../src/helpers/countryUtils.js");

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
});
