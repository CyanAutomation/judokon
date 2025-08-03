import { describe, it, expect, afterEach } from "vitest";

describe("prdReaderPage", () => {
  afterEach(() => {
    history.replaceState(null, "", "/");
  });
  it("navigates documents with wrap-around", async () => {
    const docs = {
      "b.md": "# Second doc",
      "a.md": "# First doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
      <button data-nav="prev">Prev bottom</button>
      <button data-nav="next">Next bottom</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const container = document.getElementById("prd-content");
    const titleEl = document.getElementById("prd-title");
    const nextBtns = document.querySelectorAll('[data-nav="next"]');
    const prevBtns = document.querySelectorAll('[data-nav="prev"]');
    const list = document.getElementById("prd-list");

    expect(container.innerHTML).toContain("First doc");
    expect(list.children[0].classList.contains("selected")).toBe(true);
    expect(titleEl.textContent).toBe("First doc");
    nextBtns[0].click();
    expect(container.innerHTML).toContain("Second doc");
    expect(list.children[1].classList.contains("selected")).toBe(true);
    expect(titleEl.textContent).toBe("Second doc");
    nextBtns[1].click();
    expect(container.innerHTML).toContain("First doc");
    expect(list.children[0].classList.contains("selected")).toBe(true);
    expect(titleEl.textContent).toBe("First doc");
    prevBtns[1].click();
    expect(container.innerHTML).toContain("Second doc");
    expect(list.children[1].classList.contains("selected")).toBe(true);
    expect(titleEl.textContent).toBe("Second doc");
  });

  it("selects documents via sidebar", async () => {
    const docs = {
      "docB.md": "# Two",
      "docA.md": "# One"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <div id="prd-title"></div>
      <div id="task-summary"></div>
      <ul id="prd-list"></ul>
      <div id="prd-content"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const list = document.getElementById("prd-list");
    const items = list.querySelectorAll("li");
    const container = document.getElementById("prd-content");
    const titleEl = document.getElementById("prd-title");

    expect(items.length).toBe(2);
    items[1].click();
    expect(container.innerHTML).toContain("Two");
    expect(titleEl.textContent).toBe("Two");
    items[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(container.innerHTML).toContain("One");
    expect(titleEl.textContent).toBe("One");
    expect(items[0].classList.contains("selected")).toBe(true);
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
      <div id="prd-content"></div>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const items = document.querySelectorAll("#prd-list li");
    const container = document.getElementById("prd-content");
    const titleEl = document.getElementById("prd-title");

    expect(container.innerHTML).toContain("Alpha");
    expect(titleEl.textContent).toBe("Alpha");
    items[1].click();
    expect(container.innerHTML).toContain("Beta");
    expect(titleEl.textContent).toBe("Beta");
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
      <div id="prd-content"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const summary = document.getElementById("task-summary");
    expect(summary.textContent).toContain("1/2");
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
      <div id="prd-content"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const container = document.getElementById("prd-content");
    expect(container.innerHTML).toContain("Second doc");
    expect(window.location.search).toBe("?doc=b");
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
      <div id="prd-content"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    expect(window.location.search).toBe("?doc=a");
    const next = document.querySelector('[data-nav="next"]');
    next.click();
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
    expect(warning).toBeTruthy();
    expect(warning.getAttribute("aria-label")).toBe("Content could not be fully rendered");
  });
});
