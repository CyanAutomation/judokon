import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("prdReaderPage", () => {
  it("navigates documents with wrap-around", async () => {
    const docs = {
      "file1.md": "# First doc",
      "file2.md": "# Second doc"
    };
    const marked = { parse: (md) => `<h1>${md}</h1>` };

    document.body.innerHTML = `
      <div id="prd-content"></div>
      <button id="prev-doc">Prev</button>
      <button id="next-doc">Next</button>
    `;

    globalThis.SKIP_PRD_AUTO_INIT = true;
    const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");

    await setupPrdReaderPage(docs, marked);

    const container = document.getElementById("prd-content");
    const nextBtn = document.getElementById("next-doc");
    const prevBtn = document.getElementById("prev-doc");

    expect(container.innerHTML).toContain("First doc");
    nextBtn.click();
    expect(container.innerHTML).toContain("Second doc");
    nextBtn.click();
    expect(container.innerHTML).toContain("First doc");
    prevBtn.click();
    expect(container.innerHTML).toContain("Second doc");
  });
});
