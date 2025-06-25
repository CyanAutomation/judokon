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
  it("renders active countries alphabetically", async () => {
    const data = [
      { country: "Japan", code: "jp", active: true },
      { country: "Brazil", code: "br", active: true },
      { country: "Canada", code: "ca", active: true }
    ];

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => data });

    const { populateCountryList } = await import("../../src/helpers/countryUtils.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    expect(names).toEqual(["All", "Brazil", "Canada", "Japan"]);
  });
});
