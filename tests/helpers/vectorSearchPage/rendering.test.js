import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockVectorSearch,
  mockDataUtils,
  mockConstants,
  setupPage,
  defaultDom
} from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
});

describe("rendering", () => {
  it("renders table rows when matches are found", async () => {
    const match = {
      id: "1",
      text: "lorem ipsum",
      source: "doc",
      tags: [],
      score: 0.9,
      version: 1
    };
    mockVectorSearch({
      findMatches: vi.fn().mockResolvedValue([match]),
      loadEmbeddings: vi.fn().mockResolvedValue([match])
    });
    mockDataUtils(vi.fn().mockResolvedValue({ count: 1, version: 1 }));
    mockConstants();
    const { handleSearch } = await setupPage(defaultDom);
    document.getElementById("vector-search-input").value = "ipsum";
    await handleSearch(new Event("submit"));
    expect(document.querySelectorAll("tbody tr").length).toBe(1);
  });

  it("highlights the top match", async () => {
    const matches = [
      {
        id: "1",
        text: "alpha beta",
        source: "doc1",
        tags: [],
        score: 0.9,
        version: 1
      },
      {
        id: "2",
        text: "gamma delta",
        source: "doc2",
        tags: [],
        score: 0.85,
        version: 1
      }
    ];
    mockVectorSearch({
      findMatches: vi.fn().mockResolvedValue(matches),
      loadEmbeddings: vi.fn().mockResolvedValue(matches)
    });
    mockDataUtils(vi.fn().mockResolvedValue({ count: 2, version: 1 }));
    mockConstants();
    const { handleSearch } = await setupPage(defaultDom);
    document.getElementById("vector-search-input").value = "alpha";
    await handleSearch(new Event("submit"));
    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0].classList.contains("top-match")).toBe(true);
    expect(rows[1].classList.contains("top-match")).toBe(false);
  });

  it("adds search-result-empty class when no matches", async () => {
    mockVectorSearch({
      findMatches: vi.fn().mockResolvedValue([]),
      loadEmbeddings: vi.fn().mockResolvedValue([])
    });
    mockDataUtils(vi.fn().mockResolvedValue({ count: 0, version: 1 }));
    mockConstants();
    const { handleSearch } = await setupPage(defaultDom);
    document.getElementById("vector-search-input").value = "query";
    await handleSearch(new Event("submit"));
    const msg = document.getElementById("search-results-message");
    expect(msg.classList.contains("search-result-empty")).toBe(true);
  });

  it("highlights query terms in rendered snippets", async () => {
    const match = {
      id: "1",
      text: "lorem ipsum dolor",
      source: "doc",
      tags: [],
      score: 1,
      version: 1
    };
    mockVectorSearch({
      findMatches: vi.fn().mockResolvedValue([match]),
      loadEmbeddings: vi.fn().mockResolvedValue([match])
    });
    mockDataUtils(vi.fn().mockResolvedValue({ count: 1, version: 1 }));
    mockConstants();
    const { handleSearch } = await setupPage(defaultDom);
    document.getElementById("vector-search-input").value = "ipsum";
    await handleSearch(new Event("submit"));
    const cell = document.querySelector(".match-text span");
    expect(cell.innerHTML).toContain("<mark>ipsum</mark>");
  });
});
