import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/helpers/layoutEngine/layoutRegistry.js", () => {
  return {
    getLayoutModule: vi.fn()
  };
});

const { getLayoutModule } = await import("../../../src/helpers/layoutEngine/layoutRegistry.js");
const { loadLayout } = await import("../../../src/helpers/layoutEngine/loadLayout.js");

function createLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn()
  };
}

describe("loadLayout", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    getLayoutModule.mockReset();
  });

  it("returns registry layout when lookup succeeds and payload is valid", () => {
    const layout = {
      id: "registry-layout",
      grid: { cols: 10, rows: 10 },
      regions: [{ id: "arena", rect: { x: 0, y: 0, width: 10, height: 10 } }]
    };
    getLayoutModule.mockReturnValue(layout);
    const logger = createLogger();

    const result = loadLayout("classic", { logger });

    expect(result.layout).toEqual(layout);
    expect(result.source).toBe("registry");
    expect(result.usedFallback).toBe(false);
    expect(result.errors).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("falls back to inline script when registry misses", () => {
    const fallbackLayout = {
      id: "fallback-layout",
      grid: { cols: 6, rows: 6 },
      regions: [{ id: "arena", rect: { x: 0, y: 0, width: 6, height: 6 } }]
    };
    getLayoutModule.mockReturnValue(undefined);
    document.body.innerHTML = `
      <script type="application/json" id="layout-default-classic">
        ${JSON.stringify(fallbackLayout)}
      </script>
    `;
    const logger = createLogger();

    const result = loadLayout("classic", { logger });

    expect(result.layout).toEqual(fallbackLayout);
    expect(result.source).toBe("inline-fallback");
    expect(result.usedFallback).toBe(true);
    expect(result.errors).toEqual(["Layout module not found in registry."]);
    expect(logger.warn).toHaveBeenCalledWith(
      "layoutEngine.loadLayout: Layout module not found in registry."
    );
  });

  it("aggregates errors when both registry and fallback are invalid", () => {
    getLayoutModule.mockReturnValue({ id: "bad-layout" });
    document.body.innerHTML = `
      <script type="application/json" id="layout-default">
        { "id": "fallback-only" }
      </script>
    `;
    const logger = createLogger();

    const result = loadLayout("classic", { logger });

    expect(result.layout).toBeNull();
    expect(result.source).toBe("none");
    expect(result.usedFallback).toBe(true);
    expect(result.errors).toEqual([
      "Layout grid is required.",
      "Layout regions must be a non-empty array.",
      "Layout grid is required.",
      "Layout regions must be a non-empty array."
    ]);
    expect(logger.warn).toHaveBeenCalledTimes(4);
  });

  it("returns errors when fallback script is missing", () => {
    getLayoutModule.mockReturnValue(undefined);
    const logger = createLogger();

    const result = loadLayout("classic", { logger });

    expect(result.layout).toBeNull();
    expect(result.source).toBe("none");
    expect(result.usedFallback).toBe(true);
    expect(result.errors).toEqual([
      "Layout module not found in registry.",
      "Inline fallback script tag not found."
    ]);
  });
});
