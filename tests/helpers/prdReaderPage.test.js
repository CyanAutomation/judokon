import { describe, it, expect } from "vitest";

describe("prdReaderPage", () => {
  it("navigates documents with wrap-around", async () => {
    const docs = {
      "file1.md": "# First doc",
      "file2.md": "# Second doc"
    };
    const marked = { parse: (md) => `<h1>${md}</h1>` };

    document.body.innerHTML = `
      <div id="prd-content"></div>
      <button data-nav="prev">Prev</button>
      <button data-nav="next">Next</button>
      <button data-nav="prev">Prev bottom</button>
      <button data-nav="next">Next bottom</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, marked);

    const container = document.getElementById("prd-content");
    const nextBtns = document.querySelectorAll('[data-nav="next"]');
    const prevBtns = document.querySelectorAll('[data-nav="prev"]');

    expect(container.innerHTML).toContain("First doc");
    nextBtns[0].click();
    expect(container.innerHTML).toContain("Second doc");
    nextBtns[1].click();
    expect(container.innerHTML).toContain("First doc");
    prevBtns[1].click();
    expect(container.innerHTML).toContain("Second doc");
  });
});
