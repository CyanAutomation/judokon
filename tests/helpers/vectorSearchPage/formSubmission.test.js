import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockVectorSearch,
  mockDataUtils,
  mockConstants,
  mockExtractor,
  defaultDom
} from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("vector search form submission", () => {
  it("lets native Enter key submission reach handleSearch", async () => {
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
    await mockExtractor();

    document.body.innerHTML = defaultDom;

    const mod = await import("../../../src/helpers/vectorSearchPage.js");

    await mod.init();

    const input = document.getElementById("vector-search-input");
    input.value = "grip";
    input.focus();

    const keyEvent = new window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });

    const dispatched = input.dispatchEvent(keyEvent);

    expect(dispatched).toBe(true);
    expect(keyEvent.defaultPrevented).toBe(false);

    const form = document.getElementById("vector-search-form");
    const previousPromise = window.vectorSearchResultsPromise;
    const SubmitCtor = window.SubmitEvent ?? window.Event;
    const submitEvent = new SubmitCtor("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    await window.vectorSearchResultsPromise;

    expect(window.vectorSearchResultsPromise).not.toBe(previousPromise);
    expect(searchApi.findMatches).toHaveBeenCalledTimes(1);
  });
});
