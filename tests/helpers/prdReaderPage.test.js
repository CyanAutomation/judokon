import { describe, it, expect } from "vitest";

describe("prdReaderPage", () => {
  it("navigates documents with wrap-around", async () => {
    const docs = {
      "file1.md": "# First doc",
      "file2.md": "# Second doc"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
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
    const nextBtns = document.querySelectorAll('[data-nav="next"]');
    const prevBtns = document.querySelectorAll('[data-nav="prev"]');
    const list = document.getElementById("prd-list");

    expect(container.innerHTML).toContain("First doc");
    expect(list.children[0].classList.contains("selected")).toBe(true);
    nextBtns[0].click();
    expect(container.innerHTML).toContain("Second doc");
    expect(list.children[1].classList.contains("selected")).toBe(true);
    nextBtns[1].click();
    expect(container.innerHTML).toContain("First doc");
    expect(list.children[0].classList.contains("selected")).toBe(true);
    prevBtns[1].click();
    expect(container.innerHTML).toContain("Second doc");
    expect(list.children[1].classList.contains("selected")).toBe(true);
  });

  it("selects documents via sidebar", async () => {
    const docs = {
      "doc1.md": "# One",
      "doc2.md": "# Two"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
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

    expect(items.length).toBe(2);
    items[1].click();
    expect(container.innerHTML).toContain("Two");
    items[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(container.innerHTML).toContain("One");
    expect(items[0].classList.contains("selected")).toBe(true);
  });

  it("updates #prd-content when a list item is clicked", async () => {
    const docs = {
      "alpha.md": "# Alpha",
      "beta.md": "# Beta"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <ul id="prd-list"></ul>
      <div id="prd-content"></div>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, parser);

    const items = document.querySelectorAll("#prd-list li");
    const container = document.getElementById("prd-content");

    expect(container.innerHTML).toContain("Alpha");
    items[1].click();
    expect(container.innerHTML).toContain("Beta");
  });

  it("displays task summary when element exists", async () => {
    const docs = {
      "task.md": "## Tasks\n- [x] done\n- [ ] todo"
    };
    const parser = (md) => `<h1>${md}</h1>`;

    document.body.innerHTML = `
      <ul id="prd-list"></ul>
      <div id="task-summary"></div>
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
});
