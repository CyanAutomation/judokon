import { describe, it, expect, afterEach, vi } from "vitest";
import { mockDocsMap, basicParser } from "./prdReaderPage.js";
import { createTestPrdReader } from "../utils/componentTestUtils.js";

describe("prdReaderPage", () => {
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

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const items = document.querySelectorAll("#prd-list li");
    const container = document.getElementById("prd-content");
    const titleEl = document.getElementById("prd-title");

    expect(container.innerHTML).toContain("Alpha");
    expect(titleEl.textContent).toBe("Alpha");
    expect(items[0].getAttribute("aria-current")).toBe("page");
    items[1].click();
    expect(container.innerHTML).toContain("Beta");
    expect(titleEl.textContent).toBe("Beta");
    expect(items[1].getAttribute("aria-current")).toBe("page");
  });

  it("displays task summary when element exists", async () => {
    const docs = {
      "task.md": "## Tasks\n- [x] done\n- [ ] todo"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const summary = document.getElementById("task-summary");
    const list = document.getElementById("prd-list");
    expect(summary.textContent).toContain("1/2");
    expect(list.children[0].getAttribute("aria-current")).toBe("page");
  });

  it("loads document from query parameter", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    history.replaceState(null, "", "/?doc=b");

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const container = document.getElementById("prd-content");
    const list = document.getElementById("prd-list");
    expect(container.innerHTML).toContain("Second doc");
    expect(window.location.search).toBe("?doc=b");
    expect(list.children[1].getAttribute("aria-current")).toBe("page");
  });

  it("updates URL when navigating", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const list = document.getElementById("prd-list");
    expect(window.location.search).toBe("?doc=a");
    expect(list.children[0].getAttribute("aria-current")).toBe("page");
    const next = document.querySelector('[data-nav="next"]');
    next.click();
    expect(window.location.search).toBe("?doc=b");
    expect(list.children[1].getAttribute("aria-current")).toBe("page");
  });

  it("skips history update when flag false", async () => {
    const docs = { "b.md": "# B", "a.md": "# A" };
    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
    `;
    const { loadPrdDocs, setupSidebarUI } = await import("../../src/helpers/prdReaderPage.js");
    const { replaceHistory } = await import("../../src/helpers/prdReader/history.js");
    const docData = await loadPrdDocs(docs, (md) => `<h1>${md}</h1>`);
    const sidebar = setupSidebarUI(docData);
    replaceHistory(sidebar.baseNames, sidebar.index);
    sidebar.selectDocSync(1, false, true);
    expect(window.location.search).toBe("?doc=a");
    sidebar.selectDocSync(1, true, true);
    expect(window.location.search).toBe("?doc=b");
  });

  it("shows warning badge when markdown parsing fails", async () => {
    const docs = {
      "bad.md": "# Bad\\n[link](../missing.md)"
    };
    const parser = (md) => {
      if (md.includes("../")) throw new Error("bad path");
      return `<h1>${md}</h1>`;
    };

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content"></div>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const warning = document.querySelector(".markdown-warning");
    const list = document.getElementById("prd-list");
    expect(warning).toBeTruthy();
    expect(warning.getAttribute("aria-label")).toBe("Content could not be fully rendered");
    expect(list.children[0].getAttribute("aria-current")).toBe("page");
  });

  it("supports keyboard-only navigation with focus management", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const container = document.getElementById("prd-content");
    const list = document.getElementById("prd-list");
    const items = list.querySelectorAll("li");

    expect(document.activeElement).toBe(container);
    expect(items[0].getAttribute("aria-current")).toBe("page");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(container.innerHTML).toContain("Second doc");
    expect(items[1].getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(container);

    list.focus();
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(container.innerHTML).toContain("First doc");
    expect(items[0].getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(items[0]);

    list.focus();
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(container.innerHTML).toContain("Second doc");
    expect(items[1].getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(items[1]);
  });

  it("navigates via swipe gestures", async () => {
    const docs = {
      "b.md": "# B",
      "a.md": "# A"
    };
    const parser = (md) => `<h1>${md}</h1>`;
    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;
    if (typeof TouchEvent === "undefined") {
      globalThis.TouchEvent = class extends Event {
        constructor(type, opts = {}) {
          super(type, opts);
          this.touches = opts.touches || [];
          this.changedTouches = opts.changedTouches || [];
        }
      };
    }
    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");
    await setupPrdReaderPage(docs, parser);
    const container = document.getElementById("prd-content");
    const list = document.getElementById("prd-list");
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 100 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: 0 }] }));
    expect(container.innerHTML).toContain("B");
    expect(list.children[1].getAttribute("aria-current")).toBe("page");
  });

  it("keeps rendering in sync with navigation history", async () => {
    const docs = {
      "b.md": "# Second",
      "a.md": "# First"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");
    await setupPrdReaderPage(docs, parser);

    const container = document.getElementById("prd-content");
    const list = document.getElementById("prd-list");
    document.querySelector('[data-nav="next"]').click();
    expect(history.state.index).toBe(1);
    expect(container.innerHTML).toContain("Second");
    history.replaceState({ index: 0 }, "", "?doc=a");
    window.dispatchEvent(new PopStateEvent("popstate", { state: { index: 0 } }));
    expect(history.state.index).toBe(0);
    expect(container.innerHTML).toContain("First");
    expect(list.children[0].getAttribute("aria-current")).toBe("page");
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
    vi.doMock("../../src/helpers/settingsCache.js", async () => {
      const actual = await vi.importActual("../../src/helpers/settingsCache.js");
      return { ...actual, getFeatureFlag: () => true };
    });

    const docs = { "a.md": undefined, "b.md": undefined };
    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content" tabindex="-1"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { getSanitizer } = await import("../../src/helpers/sanitizeHtml.js");
    await getSanitizer();
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve("# Doc") })
    );
    global.fetch = fetchMock;

    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");
    await setupPrdReaderPage(docs, basicParser);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
