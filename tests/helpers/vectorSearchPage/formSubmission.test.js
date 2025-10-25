import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockVectorSearch,
  mockDataUtils,
  mockConstants,
  setupPage
} from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("vector search form submission", () => {
  it("allows form submission to trigger handleSearch", async () => {
    const match = {
      id: "1",
      text: "result",
      source: "doc",
      tags: [],
      score: 0.9,
      version: 1
    };
    const searchApi = mockVectorSearch({
      findMatches: vi.fn().mockResolvedValue([match]),
      loadEmbeddings: vi.fn().mockResolvedValue([match])
    });
    mockDataUtils();
    mockConstants();
    await setupPage();

    const input = document.getElementById("vector-search-input");
    input.value = "grip";
    input.focus();

    const form = document.getElementById("vector-search-form");
    const previousPromise = window.vectorSearchResultsPromise;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      const submitButton = form.querySelector('[type="submit"]');
      if (!submitButton) {
        throw new Error("Expected a submit control for the vector search form");
      }
      submitButton.click();
    }

    await window.vectorSearchResultsPromise;

    expect(window.vectorSearchResultsPromise).not.toBe(previousPromise);
    expect(searchApi.findMatches).toHaveBeenCalledTimes(1);
  });
});
