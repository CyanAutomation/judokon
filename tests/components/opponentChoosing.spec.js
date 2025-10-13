import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));
import { showSnackbar } from "../../src/helpers/showSnackbar.js";

describe("Opponent choosing intermediate state", () => {
  let originalOverrides;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalOverrides = globalThis.window?.__FF_OVERRIDES;
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = {};
    }
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      if (originalOverrides === undefined) {
        delete window.__FF_OVERRIDES;
      } else {
        window.__FF_OVERRIDES = originalOverrides;
      }
      delete window.__OPPONENT_RESOLVE_DELAY_MS;
    }
  });

  it("shows 'Opponent is choosing…' via snackbar when flag disabled", async () => {
    showSnackbar.mockClear();
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES.opponentDelayMessage = false;
    }
    const { prepareUiBeforeSelection } = await import("../../src/pages/battleClassic.init.js");
    // Trigger
    const delay = prepareUiBeforeSelection();
    expect(delay).toBe(0);
    // Assert snackbar invoked with i18n key text (proxy via string contains)
    const calls = showSnackbar.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => /Opponent is choosing|choosing/i.test(m))).toBe(true);
  });

  it("defers snackbar when opponent delay flag enabled", async () => {
    showSnackbar.mockClear();
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES.opponentDelayMessage = true;
      window.__OPPONENT_RESOLVE_DELAY_MS = 1200;
    }
    const { prepareUiBeforeSelection } = await import("../../src/pages/battleClassic.init.js");
    const delay = prepareUiBeforeSelection();
    expect(delay).toBe(1200);
    expect(showSnackbar).not.toHaveBeenCalled();
  });
});
