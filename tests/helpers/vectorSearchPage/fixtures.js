import { vi } from "vitest";

// Prevent vectorSearchPage.js from auto-initializing during tests
vi.doMock("../../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));
vi.doMock("../../../src/components/Spinner.js", () => ({
  createSpinner: () => ({
    element: document.createElement("div"),
    show: vi.fn(),
    hide: vi.fn(),
    remove: vi.fn()
  })
}));

export function mockVectorSearch(overrides = {}) {
  const defaults = {
    findMatches: vi.fn(),
    fetchContextById: vi.fn(),
    loadEmbeddings: vi.fn().mockResolvedValue([]),
    expandQueryWithSynonyms: vi.fn((q) => q),
    CURRENT_EMBEDDING_VERSION: 1
  };
  const impl = { ...defaults, ...overrides };
  vi.doMock("../../../src/helpers/vectorSearch/index.js", () => ({ default: impl }));
  return impl;
}

export function mockDataUtils(impl) {
  const fetchJson = impl ?? vi.fn().mockResolvedValue({ count: 0, version: 1 });
  vi.doMock("../../../src/helpers/dataUtils.js", () => ({ fetchJson }));
  return fetchJson;
}

export function mockConstants() {
  vi.doMock("../../../src/helpers/constants.js", () => ({ DATA_DIR: "./" }));
}

export async function mockExtractor(impl = async () => ({ data: [0, 0, 0] })) {
  const { __setExtractor } = await import("../../../src/helpers/api/vectorSearchPage.js");
  __setExtractor(impl);
}

export const defaultDom = `
  <form id="vector-search-form">
    <input id="vector-search-input" />
    <select id="tag-filter"><option value="all">all</option></select>
  </form>
  <table id="vector-results-table"><tbody></tbody></table>
  <p id="search-results-message"></p>
`;

export async function setupPage(html = defaultDom, extractor) {
  await mockExtractor(extractor);
  document.body.innerHTML = html;
  const mod = await import("../../../src/helpers/vectorSearchPage.js");
  await mod.init();
  return mod;
}
