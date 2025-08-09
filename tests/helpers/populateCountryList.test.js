import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

describe("populateCountryList", () => {
  it("renders countries found in judoka.json alphabetically", async () => {
    const judoka = [
      { id: 1, firstname: "A", surname: "B", country: "Japan" },
      { id: 2, firstname: "C", surname: "D", country: "Brazil" },
      { id: 3, firstname: "E", surname: "F", country: "Japan" }
    ];

    const mapping = {
      jp: {
        country: "Japan",
        code: "jp",
        lastUpdated: "2025-04-23T10:00:00Z",
        active: true
      },
      br: {
        country: "Brazil",
        code: "br",
        lastUpdated: "2025-04-23T10:00:00Z",
        active: true
      },
      ca: {
        country: "Canada",
        code: "ca",
        lastUpdated: "2025-04-23T10:00:00Z",
        active: true
      }
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => judoka })
      .mockResolvedValueOnce({ ok: true, json: async () => mapping });

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    expect(names).toEqual(["All", "Brazil", "Japan"]);
  });

  it("applies accessible aria-labels to flag buttons", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];

    const mapping = {
      jp: {
        country: "Japan",
        code: "jp",
        lastUpdated: "2025-04-23T10:00:00Z",
        active: true
      }
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => judoka })
      .mockResolvedValueOnce({ ok: true, json: async () => mapping });

    const { populateCountryList } = await import("../../src/helpers/country/list.js");

    const container = document.createElement("div");
    await populateCountryList(container);

    const buttons = container.querySelectorAll("button.flag-button");
    expect(buttons[0]).toHaveAttribute("aria-label", "Show all countries");
    expect(buttons[1]).toHaveAttribute("aria-label", "Filter by Japan");
  });

  it("adds lazy loading to flag images", async () => {
    const judoka = [{ id: 1, firstname: "A", surname: "B", country: "Japan" }];
    const mapping = {
      jp: {
        country: "Japan",
        code: "jp",
        lastUpdated: "2025-04-23T10:00:00Z",
        active: true
      }
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => judoka })
      .mockResolvedValueOnce({ ok: true, json: async () => mapping });

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

    const mapping = Object.fromEntries(
      judoka.map((j, i) => {
        const code =
          String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26));
        return [
          code,
          {
            country: j.country,
            code,
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          }
        ];
      })
    );

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("judoka.json")) {
        return Promise.resolve({ ok: true, json: async () => judoka });
      }
      return Promise.resolve({ ok: true, json: async () => mapping });
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
    const mapping = {
      jp: {
        country: "Japan",
        code: "jp",
        lastUpdated: "2025-04-23T10:00:00Z",
        active: true
      }
    };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => judoka })
      .mockResolvedValueOnce({ ok: true, json: async () => mapping });
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    const slides = container.querySelectorAll(".slide");
    const names = [...slides].map((s) => s.querySelector("p").textContent);
    // Should only have "All" and "Japan"
    expect(names).toEqual(["All", "Japan"]);
  });

  it("shows a message if no countries are found", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { populateCountryList } = await import("../../src/helpers/country/list.js");
    const container = document.createElement("div");
    await populateCountryList(container);
    expect(container.textContent).toBe("No countries available.");
    expect(container.querySelectorAll(".slide").length).toBe(0);
  });
});
