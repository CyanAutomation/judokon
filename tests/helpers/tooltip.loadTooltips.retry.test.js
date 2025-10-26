import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchJsonMock = vi.hoisted(() => vi.fn());
const importJsonModuleMock = vi.hoisted(() => vi.fn());
const debugLogMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: fetchJsonMock,
  importJsonModule: importJsonModuleMock
}));

vi.mock("../../src/helpers/settingsStorage.js", () => ({
  loadSettings: vi.fn().mockResolvedValue({ tooltips: true })
}));

vi.mock("../../src/helpers/debug.js", () => ({
  debugLog: debugLogMock,
  DEBUG_LOGGING: true
}));

describe("loadTooltips", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchJsonMock.mockReset();
    importJsonModuleMock.mockReset();
    debugLogMock.mockReset();
  });

  it("retries after a rejected tooltip data promise", async () => {
    fetchJsonMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ retry: { success: "Loaded" } });
    importJsonModuleMock.mockRejectedValueOnce(new Error("fallback failed"));

    const { getTooltips } = await import("../../src/helpers/tooltip.js");

    await expect(getTooltips()).rejects.toThrowError(/fallback failed/);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(importJsonModuleMock).toHaveBeenCalledTimes(1);
    expect(debugLogMock).toHaveBeenCalledTimes(2);
    expect(debugLogMock.mock.calls[1][0]).toBe(
      "Tooltip data promise rejected; clearing cache for retry."
    );

    await expect(getTooltips()).resolves.toEqual({ "retry.success": "Loaded" });
    expect(fetchJsonMock).toHaveBeenCalledTimes(2);
    expect(importJsonModuleMock).toHaveBeenCalledTimes(1);
  });
});
