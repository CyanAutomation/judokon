import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { mockDocsMap, basicParser } from "./prdReaderPage.js";
import { createTestPrdReader } from "../utils/componentTestUtils.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockInitTooltips, mockGetFeatureFlag } = vi.hoisted(() => ({
  mockInitTooltips: vi.fn(() => Promise.reject(new Error("tooltip failure"))),
  mockGetFeatureFlag: vi.fn(() => false)
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/tooltip.js", async () => {
  const actual = await vi.importActual("../../src/helpers/tooltip.js");
  return {
    ...actual,
    initTooltips: mockInitTooltips
  };
});

vi.mock("../../src/helpers/settingsCache.js", async () => {
  const actual = await vi.importActual("../../src/helpers/settingsCache.js");
  return { ...actual, getFeatureFlag: mockGetFeatureFlag };
});

describe("prdReaderPage", () => {
  beforeEach(() => {
    mockInitTooltips.mockReset();
    mockGetFeatureFlag.mockReset().mockReturnValue(false);
  });

  afterEach(() => {
    history.replaceState(null, "", "/");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("loads and sorts file list", async () => {
    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { loadPrdFileList } = await import("../../src/helpers/prdReaderPage.js");
    const { files, baseNames } = await loadPrdFileList({
      "b.md": "",
      "a.md": ""
    });
    expect(files).toEqual(["a.md", "b.md"]);
    expect(baseNames).toEqual(["a", "b"]);
  });

  it("seeds history state from doc map", async () => {
    history.replaceState(null, "", "/?doc=b");

    // Use component factory instead of innerHTML manipulation
    const prdReader = createTestPrdReader(mockDocsMap, basicParser);
    await prdReader.testApi.initialize();

    expect(history.state.index).toBe(1);
    expect(new URL(window.location).search).toBe("?doc=b");

    // Cleanup
    prdReader.testApi.cleanup();
  });

  it("navigates documents with wrap-around", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    // Use component factory instead of innerHTML manipulation
    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    // Test initial state
    expect(prdReader.testApi.getCurrentContent()).toContain("First doc");
    expect(prdReader.testApi.getSelectedIndex()).toBe(0);
    expect(prdReader.testApi.getCurrentTitle()).toBe("First doc");

    // Test next navigation
    prdReader.testApi.navigateNext();
    expect(prdReader.testApi.getCurrentContent()).toContain("Second doc");
    expect(prdReader.testApi.getSelectedIndex()).toBe(1);
    expect(prdReader.testApi.getCurrentTitle()).toBe("Second doc");

    // Test wrap-around (next from last)
    prdReader.testApi.navigateNext();
    expect(prdReader.testApi.getCurrentContent()).toContain("First doc");
    expect(prdReader.testApi.getSelectedIndex()).toBe(0);
    expect(prdReader.testApi.getCurrentTitle()).toBe("First doc");

    // Test previous navigation with wrap-around
    prdReader.testApi.navigatePrev();
    expect(prdReader.testApi.getCurrentContent()).toContain("Second doc");
    expect(prdReader.testApi.getSelectedIndex()).toBe(1);
    expect(prdReader.testApi.getCurrentTitle()).toBe("Second doc");

    // Cleanup
    prdReader.testApi.cleanup();
  });

  it("continues rendering when tooltip init fails", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;
    const initError = new Error("tooltip failure");
    mockInitTooltips.mockImplementation(() => Promise.reject(initError));

    const prdReader = createTestPrdReader(docs, parser);
    const unhandled = vi.fn();
    const rejectionHandler = (event) => {
      unhandled(event);
    };
    window.addEventListener("unhandledrejection", rejectionHandler);

    try {
      await prdReader.testApi.initialize();
      await Promise.resolve();

      expect(prdReader.testApi.getCurrentContent()).toContain("First doc");
      expect(mockInitTooltips).toHaveBeenCalled();
      const callsAfterInit = mockInitTooltips.mock.calls.length;
      expect(unhandled).not.toHaveBeenCalled();

      prdReader.testApi.navigateNext();
      await Promise.resolve();

      expect(prdReader.testApi.getCurrentContent()).toContain("Second doc");
      expect(prdReader.testApi.getSelectedIndex()).toBe(1);
      expect(unhandled).not.toHaveBeenCalled();
      expect(mockInitTooltips.mock.calls.length).toBeGreaterThan(callsAfterInit);
    } finally {
      window.removeEventListener("unhandledrejection", rejectionHandler);
      prdReader.testApi.cleanup();
    }
  });

  it("selects documents via sidebar", async () => {
    const docs = {
      "docB.md": "# Two",
      "docA.md": "# One"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    // Use component factory instead of innerHTML manipulation
    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    // Test initial state: expect "One" (alphabetically first)
    expect(prdReader.testApi.getCurrentContent()).toContain("One");
    expect(prdReader.testApi.getCurrentTitle()).toBe("One");
    expect(prdReader.testApi.getSelectedIndex()).toBe(0);

    // Test direct selection
    prdReader.testApi.selectDocument(1);
    expect(prdReader.testApi.getCurrentContent()).toContain("Two");
    expect(prdReader.testApi.getCurrentTitle()).toBe("Two");
    expect(prdReader.testApi.getSelectedIndex()).toBe(1);

    // Test keyboard navigation
    prdReader.testApi.navigateWithKeyboard("Enter");
    expect(prdReader.testApi.getCurrentContent()).toContain("Two");
    expect(prdReader.testApi.getCurrentTitle()).toBe("Two");

    // Cleanup
    prdReader.testApi.cleanup();
  });

  it("updates #prd-content when a list item is clicked", async () => {
    const docs = {
      "beta.md": "# Beta",
      "alpha.md": "# Alpha"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    const content = prdReader.testApi.getContentContainer();
    const titleEl = prdReader.testApi.getTitleElement();
    const items = prdReader.testApi.getListItems();

    expect(content.innerHTML).toContain("Alpha");
    expect(titleEl.textContent).toBe("Alpha");
    expect(items[0].getAttribute("aria-current")).toBe("page");

    prdReader.testApi.selectDocument(1);

    expect(content.innerHTML).toContain("Beta");
    expect(titleEl.textContent).toBe("Beta");
    expect(prdReader.testApi.getListItem(1).getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("displays task summary when element exists", async () => {
    const docs = {
      "task.md": "## Tasks\n- [x] done\n- [ ] todo"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    const summary = prdReader.testApi.getTaskSummary();
    const firstItem = prdReader.testApi.getListItem(0);

    expect(summary.textContent).toContain("1/2");
    expect(firstItem?.getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("loads document from query parameter", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    history.replaceState(null, "", "/?doc=b");

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    const content = prdReader.testApi.getContentContainer();
    const secondItem = prdReader.testApi.getListItem(1);

    expect(content.innerHTML).toContain("Second doc");
    expect(window.location.search).toBe("?doc=b");
    expect(secondItem?.getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("updates URL when navigating", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    expect(window.location.search).toBe("?doc=a");
    expect(prdReader.testApi.getListItem(0)?.getAttribute("aria-current")).toBe("page");

    prdReader.testApi.navigateNext();

    expect(window.location.search).toBe("?doc=b");
    expect(prdReader.testApi.getListItem(1)?.getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("skips history update when flag false", async () => {
    const docs = { "b.md": "# B", "a.md": "# A" };
    const prdReader = createTestPrdReader(docs, (md) => `<h1>${md}</h1>`);
    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { loadPrdDocs, setupSidebarUI } = await import("../../src/helpers/prdReaderPage.js");
    const { replaceHistory } = await import("../../src/helpers/prdReader/history.js");
    const docData = await loadPrdDocs(docs, (md) => `<h1>${md}</h1>`);
    const sidebar = setupSidebarUI(docData);
    replaceHistory(sidebar.baseNames, sidebar.index);
    sidebar.selectDocSync(1, false, true);
    expect(window.location.search).toBe("?doc=a");
    sidebar.selectDocSync(1, true, true);
    expect(window.location.search).toBe("?doc=b");
    prdReader.testApi.cleanup();
  });

  it("shows warning badge when markdown parsing fails", async () => {
    const docs = {
      "bad.md": "# Bad\\n[link](../missing.md)"
    };
    const parser = (md) => {
      if (md.includes("../")) throw new Error("bad path");
      return `<h1>${md}</h1>`;
    };

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    const warning = prdReader.testApi.getWarningBadge();
    const firstItem = prdReader.testApi.getListItem(0);

    expect(warning).toBeTruthy();
    expect(warning?.getAttribute("aria-label")).toBe("Content could not be fully rendered");
    expect(firstItem?.getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("supports keyboard-only navigation with focus management", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    const container = prdReader.testApi.getContentContainer();
    const list = prdReader.testApi.getDocumentList();
    const radios = Array.from(list.querySelectorAll("input[type='radio']"));

    expect(document.activeElement).toBe(container);
    expect(prdReader.testApi.getListItem(0)?.getAttribute("aria-current")).toBe("page");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(container.innerHTML).toContain("Second doc");
    expect(prdReader.testApi.getListItem(1)?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(container);

    radios[0]?.focus();
    expect(document.activeElement).toBe(radios[0]);
    radios[0].checked = true;
    radios[0].dispatchEvent(new Event("change", { bubbles: true }));
    expect(container.innerHTML).toContain("First doc");
    expect(prdReader.testApi.getListItem(0)?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(container);

    radios[1]?.focus();
    expect(document.activeElement).toBe(radios[1]);
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event("change", { bubbles: true }));
    expect(container.innerHTML).toContain("Second doc");
    expect(prdReader.testApi.getListItem(1)?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(container);

    prdReader.testApi.cleanup();
  });

  it("navigates via swipe gestures", async () => {
    const docs = {
      "b.md": "# B",
      "a.md": "# A"
    };
    const parser = (md) => `<h1>${md}</h1>`;
    const prdReader = createTestPrdReader(docs, parser);
    if (typeof TouchEvent === "undefined") {
      globalThis.TouchEvent = class extends Event {
        constructor(type, opts = {}) {
          super(type, opts);
          this.touches = opts.touches || [];
          this.changedTouches = opts.changedTouches || [];
        }
      };
    }
    await prdReader.testApi.initialize();
    const container = prdReader.testApi.getContentContainer();
    const listItems = prdReader.testApi.getListItems();
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 100 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: 0 }] }));
    expect(container.innerHTML).toContain("B");
    expect(listItems[1].getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("keeps rendering in sync with navigation history", async () => {
    const docs = {
      "b.md": "# Second",
      "a.md": "# First"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    const prdReader = createTestPrdReader(docs, parser);
    await prdReader.testApi.initialize();

    const container = prdReader.testApi.getContentContainer();
    prdReader.testApi.navigateNext();
    expect(history.state.index).toBe(1);
    expect(container.innerHTML).toContain("Second");

    // Use full URL for history operations to work correctly in test environment
    const url = new URL(window.location.href);
    url.searchParams.set("doc", "a");
    history.replaceState({ index: 0 }, "", url.href);

    window.dispatchEvent(new PopStateEvent("popstate", { state: { index: 0 } }));
    expect(history.state.index).toBe(0);
    expect(container.innerHTML).toContain("First");
    expect(prdReader.testApi.getListItem(0)?.getAttribute("aria-current")).toBe("page");

    prdReader.testApi.cleanup();
  });

  it("bindHistory invokes callback on popstate", async () => {
    const { bindHistory } = await import("../../src/helpers/prdReader/history.js");
    const fn = vi.fn();
    const unbind = bindHistory(fn);
    window.dispatchEvent(new PopStateEvent("popstate", { state: { index: 2 } }));
    expect(fn).toHaveBeenCalledWith(2);
    unbind();
  });

  it("skips prefetching when test mode flag is enabled", async () => {
    mockGetFeatureFlag.mockReturnValue(true);

    const docs = { "a.md": undefined, "b.md": undefined };
    const prdReader = createTestPrdReader(docs, basicParser);
    const { getSanitizer } = await import("../../src/helpers/sanitizeHtml.js");
    await getSanitizer();
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve("# Doc") })
    );
    global.fetch = fetchMock;

    await prdReader.testApi.initialize();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    prdReader.testApi.cleanup();
  });
});
