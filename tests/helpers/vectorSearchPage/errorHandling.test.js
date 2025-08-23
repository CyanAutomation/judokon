import { describe, it, expect, vi, afterEach } from "vitest";
import { mockVectorSearch, mockDataUtils, mockConstants, setupPage } from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
});

describe("error handling", () => {
  it("shows a message when embedding load fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockVectorSearch({
      loadEmbeddings: vi.fn().mockRejectedValue(new Error("boom")),
      findMatches: vi.fn()
    });
    mockDataUtils(vi.fn().mockResolvedValue({ count: 0, version: 1 }));
    mockConstants();
    const html = `
      <form id="vector-search-form"></form>
      <p id="search-results-message"></p>
    `;
    await setupPage(html);
    const msg = document.getElementById("search-results-message");
    expect(msg.textContent).toContain("Failed to load search data");
    consoleError.mockRestore();
  });

  it("shows a fallback message when query vector construction fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const findMatches = vi.fn();
    mockVectorSearch({ findMatches });
    mockDataUtils();
    mockConstants();
    const { handleSearch } = await setupPage(undefined, async () => ({ data: 123 }));
    document.getElementById("vector-search-input").value = "test";
    await handleSearch(new Event("submit"));
    expect(findMatches).not.toHaveBeenCalled();
    const msg = document.getElementById("search-results-message");
    expect(msg.textContent).toContain("An error occurred while searching.");
    consoleError.mockRestore();
  });
});
