import { describe, it, expect, vi } from "vitest";

// Prevent vectorSearchPage.js from auto-initializing during tests
vi.doMock("../../src/helpers/domReady.js", () => ({
  onDomReady: vi.fn()
}));

describe("vector search page integration", () => {
  it("passes selected tag to findMatches", async () => {
    const findMatches = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([{ tags: ["foo"], version: 1 }]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn(async (path) => {
        if (path.endsWith("client_embeddings.meta.json")) {
          return { count: 1, version: 1 }; // Mock the meta.json with a version
        }
        return {}; // Default for other fetchJson calls
      })
    }));

    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    __setExtractor(async () => ({ data: [0, 0, 0] }));

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="foo">foo</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;

    document.getElementById("vector-search-input").value = "test";

    await init();

    document.getElementById("tag-filter").value = "foo";
    await handleSearch(new Event("submit"));

    expect(findMatches).toHaveBeenCalled();
    expect(findMatches.mock.calls[0][2]).toEqual(["foo"]);
  });

  it("displays embedding count and tag options on init", async () => {
    const embeddings = [
      { tags: ["alpha"], version: 1 },
      { tags: ["beta"], version: 1 }
    ];
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches: vi.fn(),
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue(embeddings),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 2, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { init } = await import("../../src/helpers/vectorSearchPage.js");

    document.body.innerHTML = `
      <select id="tag-filter"></select>
      <div id="search-spinner"></div>
      <form id="vector-search-form"></form>
      <p id="embedding-stats"></p>
    `;

    await init();

    const statsEl = document.getElementById("embedding-stats");
    expect(statsEl.textContent).toContain("2");
    const options = Array.from(
      document.getElementById("tag-filter").querySelectorAll("option")
    ).map((o) => o.value);
    expect(options).toEqual(["all", "alpha", "beta"]);
  });

  it("shows a message when embedding load fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches: vi.fn(),
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockRejectedValue(new Error("boom")),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 0, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "./" }));

    const { init } = await import("../../src/helpers/vectorSearchPage.js");

    document.body.innerHTML = `
      <div id="search-spinner" style="display:block"></div>
      <form id="vector-search-form"></form>
      <p id="search-results-message"></p>
    `;

    await init();

    const msg = document.getElementById("search-results-message");
    expect(msg.textContent).toContain("Failed to load search data");
    expect(document.getElementById("search-spinner").style.display).toBe("none");

    consoleError.mockRestore();
  });
});

describe("search result message styling", () => {
  it("adds search-result-empty class when no matches", async () => {
    const findMatches = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 0, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    __setExtractor(async () => ({ data: [0, 0, 0] }));

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;

    await init();

    document.getElementById("vector-search-input").value = "query";
    await handleSearch(new Event("submit"));

    const messageEl = document.getElementById("search-results-message");
    expect(messageEl.classList.contains("search-result-empty")).toBe(true);
  });

  it("adds search-result-empty class when only weak matches returned", async () => {
    const match = {
      id: "1",
      score: 0.5,
      text: "test",
      source: "doc",
      tags: [],
      version: 1
    };
    const findMatches = vi.fn().mockResolvedValue([match]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([match]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 1, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    __setExtractor(async () => ({ data: [0, 0, 0] }));

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;

    await init();

    document.getElementById("vector-search-input").value = "query";
    await handleSearch(new Event("submit"));

    const messageEl = document.getElementById("search-results-message");
    expect(messageEl.classList.contains("search-result-empty")).toBe(true);
  });

  it("removes search-result-empty class when strong matches exist", async () => {
    const match = {
      id: "1",
      score: 0.8,
      text: "test",
      source: "doc",
      tags: [],
      version: 1
    };
    const findMatches = vi.fn().mockResolvedValue([match]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([match]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 1, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    __setExtractor(async () => ({ data: [0, 0, 0] }));

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message" class="search-result-empty"></p>
    `;

    await init();

    document.getElementById("vector-search-input").value = "query";
    await handleSearch(new Event("submit"));

    const messageEl = document.getElementById("search-results-message");
    expect(messageEl.classList.contains("search-result-empty")).toBe(false);
  });
});

describe("highlightTerms", () => {
  it("wraps query words in <mark>", async () => {
    const { highlightTerms } = await import("../../src/helpers/snippetFormatter.js");
    const result = highlightTerms("The Quick Brown Fox", ["quick", "fox"]);
    expect(result).toBe("The <mark>Quick</mark> Brown <mark>Fox</mark>");
  });

  it("returns escaped text when no terms provided", async () => {
    const { highlightTerms } = await import("../../src/helpers/snippetFormatter.js");
    expect(highlightTerms("<script>", [])).toBe("&lt;script&gt;");
  });
});

describe("snippet highlighting", () => {
  it("highlights query terms in rendered snippets", async () => {
    const match = {
      id: "1",
      text: "lorem ipsum dolor",
      score: 1,
      source: "doc",
      tags: [],
      version: 1
    };
    const findMatches = vi.fn().mockResolvedValue([match]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([match]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 1, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    __setExtractor(async () => ({ data: [0, 0, 0] }));

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;

    await init();

    document.getElementById("vector-search-input").value = "ipsum";
    await handleSearch(new Event("submit"));
    const cell = document.querySelector(".match-text span");
    expect(cell.innerHTML).toContain("<mark>ipsum</mark>");
  });
});

describe("synonym expansion", () => {
  it("expands query terms using the synonym list", async () => {
    const synonyms = { "shoulder throw": ["seoi-nage"] };
    vi.doMock("../../src/helpers/vectorSearch/index.js", async () => {
      const { expandQueryWithSynonyms } = await import("../../src/helpers/vectorSearchQuery.js");
      return {
        default: {
          findMatches: vi.fn().mockResolvedValue([]),
          fetchContextById: vi.fn(),
          loadEmbeddings: vi.fn().mockResolvedValue([]),
          expandQueryWithSynonyms,
          CURRENT_EMBEDDING_VERSION: 1
        }
      };
    });
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(synonyms)
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const vectorSearch = (await import("../../src/helpers/vectorSearch/index.js")).default;

    const result = await vectorSearch.expandQueryWithSynonyms("shoulder throw");
    expect(result).toContain("seoi-nage");
  });

  it("handles misspellings via Levenshtein check", async () => {
    const synonyms = { "seoi nage": ["seoi-nage"] };
    const findMatches = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", async () => {
      const { expandQueryWithSynonyms } = await import("../../src/helpers/vectorSearchQuery.js");
      return {
        default: {
          findMatches,
          fetchContextById: vi.fn(),
          loadEmbeddings: vi.fn().mockResolvedValue([]),
          expandQueryWithSynonyms,
          CURRENT_EMBEDDING_VERSION: 1
        }
      };
    });
    vi.doMock("../../src/helpers/dataUtils.js", () => {
      const fetchJson = vi.fn(async (path) => {
        if (path.endsWith("synonyms.json")) return synonyms;
        if (path.endsWith("client_embeddings.meta.json")) return { count: 0, version: 1 };
        return null;
      });
      return { fetchJson };
    });
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    let captured = "";
    __setExtractor(async (text) => {
      captured = text;
      return { data: [0, 0, 0] };
    });

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;

    await init();

    document.getElementById("vector-search-input").value = "seoi nagee";
    await handleSearch(new Event("submit"));

    expect(captured).toContain("seoi-nage");
    expect(findMatches).toHaveBeenCalled();
  });
});

describe("search results", () => {
  it("renders table rows when matches are found", async () => {
    const match = {
      id: "1",
      text: "lorem ipsum",
      source: "doc",
      tags: [],
      score: 0.9,
      version: 1
    };
    const findMatches = vi.fn().mockResolvedValue([match]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([match]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 1, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "./" }));
    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");
    __setExtractor(async () => ({ data: [0, 0, 0] }));
    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;
    await init();
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
    const findMatches = vi.fn().mockResolvedValue(matches);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue(matches),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 2, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "./" }));
    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");
    __setExtractor(async () => ({ data: [0, 0, 0] }));
    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;
    await init();
    document.getElementById("vector-search-input").value = "alpha";
    await handleSearch(new Event("submit"));
    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0].classList.contains("top-match")).toBe(true);
    expect(rows[1].classList.contains("top-match")).toBe(false);
  });

  it("shows a warning when only weak matches exist", async () => {
    const matches = [
      {
        id: "1",
        text: "alpha",
        source: "doc1",
        tags: [],
        score: 0.5,
        version: 1
      }
    ];
    const findMatches = vi.fn().mockResolvedValue(matches);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue(matches),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 1, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "./" }));
    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");
    __setExtractor(async () => ({ data: [0, 0, 0] }));
    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;
    await init();
    document.getElementById("vector-search-input").value = "alpha";
    await handleSearch(new Event("submit"));
    const msg = document.getElementById("search-results-message");
    expect(msg.textContent).toContain("No strong matches");
    expect(document.querySelectorAll("tbody tr").length).toBe(1);
  });

  it("shows a message when no matches are found", async () => {
    const findMatches = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        findMatches,
        fetchContextById: vi.fn(),
        loadEmbeddings: vi.fn().mockResolvedValue([]),
        expandQueryWithSynonyms: vi.fn((q) => q),
        CURRENT_EMBEDDING_VERSION: 1
      }
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 0, version: 1 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "./" }));
    const { handleSearch, init } = await import("../../src/helpers/vectorSearchPage.js");
    const { __setExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");
    __setExtractor(async () => ({ data: [0, 0, 0] }));
    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="all">all</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;
    await init();
    document.getElementById("vector-search-input").value = "test";
    await handleSearch(new Event("submit"));
    const msg = document.getElementById("search-results-message");
    expect(msg.textContent).toContain("No close matches");
    expect(msg.classList.contains("search-result-empty")).toBe(true);
    expect(document.querySelectorAll("tbody tr").length).toBe(0);
  });
});
