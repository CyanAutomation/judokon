import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));
import { showSnackbar } from "../../src/helpers/showSnackbar.js";

describe("Opponent choosing intermediate state", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows 'Opponent is choosing…' via snackbar when preparing selection", async () => {
    const { prepareUiBeforeSelection } = await import("../../src/pages/battleClassic.init.js");
    // Trigger
    prepareUiBeforeSelection();
    // Assert snackbar invoked with i18n key text (proxy via string contains)
    const calls = showSnackbar.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => /Opponent is choosing|choosing/i.test(m))).toBe(true);
  });
});
