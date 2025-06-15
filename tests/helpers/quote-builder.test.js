import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("displayRandomQuote", () => {
  it("renders a fetched fable", async () => {
    const quoteDiv = document.createElement("div");
    quoteDiv.id = "quote";
    quoteDiv.className = "hidden";
    const loader = document.createElement("div");
    loader.id = "quote-loader";
    const toggle = document.createElement("button");
    toggle.id = "language-toggle";
    toggle.className = "hidden";
    document.body.append(quoteDiv, loader, toggle);

    const data = [{ id: 1, title: "A", story: "B" }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    vi.spyOn(Math, "random").mockReturnValue(0);

    await import("../../src/helpers/quoteBuilder.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((r) => setTimeout(r, 0));

    expect(quoteDiv.classList.contains("hidden")).toBe(false);
    expect(loader.classList.contains("hidden")).toBe(true);
    expect(quoteDiv.innerHTML).toContain("A");
    expect(toggle.classList.contains("hidden")).toBe(false);
  });

  it("shows fallback text when fetching fails", async () => {
    const quoteDiv = document.createElement("div");
    quoteDiv.id = "quote";
    const loader = document.createElement("div");
    loader.id = "quote-loader";
    document.body.append(quoteDiv, loader);

    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    await import("../../src/helpers/quoteBuilder.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((r) => setTimeout(r, 0));

    expect(quoteDiv.textContent).toContain("Well done, congratulations!");
  });
});
