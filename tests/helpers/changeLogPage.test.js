import { describe, it, expect, vi } from "vitest";
import { mount, clearBody } from "./domUtils.js";

const sample = [
  {
    id: 2,
    firstname: "Alpha",
    surname: "Zulu",
    cardCode: "A",
    lastUpdated: "2025-04-02T10:00:00Z"
  },
  {
    id: 1,
    firstname: "Beta",
    surname: "Alpha",
    cardCode: "B",
    lastUpdated: "2025-04-03T10:00:00Z"
  },
  {
    id: 3,
    firstname: "Charlie",
    surname: "Bravo",
    cardCode: "C",
    lastUpdated: "2025-04-03T10:00:00Z"
  }
];

describe("changeLogPage", () => {
  it("sorts by lastUpdated then name", async () => {
    const { sortJudoka } = await import("../../src/helpers/changeLogPage.js");
    const sorted = sortJudoka(sample);
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(2);
  });

  it("falls back to placeholder portrait", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue([sample[0]])
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "", SPINNER_DELAY_MS: 0 }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));

    const { setupChangeLogPage } = await import("../../src/helpers/changeLogPage.js");

    mount(`
      <div id="loading-container"></div>
      <table id="changelog-table"><tbody></tbody></table>
    `);

    await setupChangeLogPage();

    const img = document.querySelector("img");
    img.dispatchEvent(new Event("error"));
    expect(img.src).toMatch(/judokaPortrait-0\.png$/);
    clearBody();
  });
});
