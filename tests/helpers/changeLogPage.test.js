import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, clearBody } from "./domUtils.js";
import { createSimpleHarness } from "./integrationHarness.js";

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

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockFetchJson, mockInitTooltips } = vi.hoisted(() => ({
  mockFetchJson: vi.fn(),
  mockInitTooltips: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: mockFetchJson
}));

vi.mock("../../src/helpers/constants.js", () => ({
  DATA_DIR: "",
  SPINNER_DELAY_MS: 0
}));

vi.mock("../../src/helpers/tooltip.js", () => ({
  initTooltips: mockInitTooltips
}));

describe("changeLogPage", () => {
  let harness;

  beforeEach(async () => {
    // Reset mocks before each test
    mockFetchJson.mockReset().mockResolvedValue([sample[0]]);
    mockInitTooltips.mockReset().mockResolvedValue(() => {});

    harness = createSimpleHarness();
    await harness.setup();
  });

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
    }
    clearBody();
  });

  it("sorts by lastUpdated then name", async () => {
    const { sortJudoka } = await harness.importModule("../../src/helpers/changeLogPage.js");
    const sorted = sortJudoka(sample);
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(2);
  });

  it("falls back to placeholder portrait", async () => {
    const { setupChangeLogPage } = await harness.importModule("../../src/helpers/changeLogPage.js");

    mount(`
      <div id="loading-container"></div>
      <table id="changelog-table"><tbody></tbody></table>
    `);

    await setupChangeLogPage();

    const img = document.querySelector("img");
    img.dispatchEvent(new Event("error"));
    expect(img.src).toMatch(/judokaPortrait-0\.png$/);
  });
});
