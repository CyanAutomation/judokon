import { describe, it, expect } from "vitest";

describe("mockupViewerPage", () => {
  it("navigates images and updates sidebar", async () => {
    document.body.innerHTML = `
      <ul id="mockup-list"></ul>
      <img id="mockup-image" />
      <div id="mockup-filename"></div>
      <button id="prev-btn">Prev</button>
      <button id="next-btn">Next</button>
    `;

    globalThis.SKIP_MOCKUP_AUTO_INIT = true;
    const { setupMockupViewerPage } = await import("../../src/helpers/mockupViewerPage.js");

    await setupMockupViewerPage();

    const list = document.getElementById("mockup-list");
    const img = document.getElementById("mockup-image");
    const nextBtn = document.getElementById("next-btn");

    expect(list.children.length).toBeGreaterThan(0);
    const firstSrc = img.src;
    nextBtn.click();
    expect(list.children[1].classList.contains("selected")).toBe(true);
    expect(img.src).not.toBe(firstSrc);
  });

  it("selects image via sidebar", async () => {
    document.body.innerHTML = `
      <ul id="mockup-list"></ul>
      <img id="mockup-image" />
      <div id="mockup-filename"></div>
      <button id="prev-btn">Prev</button>
      <button id="next-btn">Next</button>
    `;

    globalThis.SKIP_MOCKUP_AUTO_INIT = true;
    const { setupMockupViewerPage } = await import("../../src/helpers/mockupViewerPage.js");

    await setupMockupViewerPage();

    const list = document.getElementById("mockup-list");
    const img = document.getElementById("mockup-image");
    const item = list.children[1];

    item.click();

    expect(item.classList.contains("selected")).toBe(true);
    expect(img.src).toContain(item.textContent);
  });
});
