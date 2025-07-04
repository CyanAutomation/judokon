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
});
