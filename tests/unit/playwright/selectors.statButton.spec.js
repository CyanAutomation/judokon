import { afterEach, describe, expect, it, vi } from "vitest";

const SELECTORS_PATH = "../../../playwright/helpers/selectors.js";
const MAPPING_PATH = "../../../design/dataSchemas/battleMarkup.generated.js";

async function importSelectorsWith(entries) {
  vi.resetModules();
  vi.doMock(MAPPING_PATH, () => ({
    default: {
      entries
    }
  }), { virtual: true });

  return import(SELECTORS_PATH);
}

describe("statButton selector helper", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("throws when a legacy player index is provided", async () => {
    const { statButton } = await importSelectorsWith([
      { logicalName: "statButton", selector: ".stat-button[data-stat]" }
    ]);

    expect(() => statButton(0)).toThrow(/no longer accepts a playerIndex/);
  });

  it("returns the schema selector when no stat key is provided", async () => {
    const { statButton } = await importSelectorsWith([
      { logicalName: "statButton", selector: ".stat-button[data-stat]" }
    ]);

    expect(statButton()).toBe(".stat-button[data-stat]");
  });

  it("scopes to a specific stat when the selector contains multiple data-stat attributes", async () => {
    const selector = ".foo[data-stat][data-variant][data-stat=\"speed\"]";
    const { statButton } = await importSelectorsWith([
      { logicalName: "statButton", selector }
    ]);

    expect(statButton({ statKey: "power" })).toBe(
      ".foo[data-stat=\"power\"][data-variant][data-stat=\"power\"]"
    );
  });

  it("appends a stat attribute when the schema selector lacks one", async () => {
    const { statButton } = await importSelectorsWith([
      { logicalName: "statButton", selector: ".foo" }
    ]);

    expect(statButton("tech")).toBe(".foo[data-stat=\"tech\"]");
  });

  it("falls back to the canonical stat button selector when schema data is missing", async () => {
    const { statButton } = await importSelectorsWith([]);

    expect(statButton()).toBe(".stat-button[data-stat]");
  });
});
