import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  getPointsToWin: vi.fn()
}));

describe("syncWinTargetDropdown", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="cli-root" data-round="3" data-target="5"></div>
      <div id="cli-round"></div>
      <select id="points-select">
        <option value="3">3</option>
        <option value="5">5</option>
      </select>
    `;
    document.body.dataset.target = "5";
    const select = document.getElementById("points-select");
    if (select) {
      select.value = "5";
    }
  });

  it("injects missing target option and updates header metadata", async () => {
    const battleFacade = await import("../../../src/helpers/battleEngineFacade.js");
    battleFacade.getPointsToWin.mockReturnValue(7);
    const { syncWinTargetDropdown } = await import(
      "../../../src/helpers/classicBattle/winTargetSync.js"
    );

    syncWinTargetDropdown();

    const select = document.getElementById("points-select");
    expect(select?.value).toBe("7");
    const options = Array.from(select?.options ?? []).map((option) => option.value);
    expect(options).toContain("7");
    expect(document.getElementById("cli-round")?.textContent).toBe("Round 3 Target: 7");
    expect(document.getElementById("cli-root")?.dataset.target).toBe("7");
  });

  it("falls back to stored dataset target when facade target is invalid", async () => {
    const battleFacade = await import("../../../src/helpers/battleEngineFacade.js");
    battleFacade.getPointsToWin.mockReturnValue(Number.NaN);
    document.body.dataset.target = "11";
    const { syncWinTargetDropdown } = await import(
      "../../../src/helpers/classicBattle/winTargetSync.js"
    );

    syncWinTargetDropdown();

    const select = document.getElementById("points-select");
    expect(select?.value).toBe("11");
    const options = Array.from(select?.options ?? []).map((option) => option.value);
    expect(options).toContain("11");
    expect(document.getElementById("cli-round")?.textContent).toBe("Round 3 Target: 11");
    expect(document.getElementById("cli-root")?.dataset.target).toBe("11");
  });

  it("ignores invalid targets that would not render in the dropdown", async () => {
    const battleFacade = await import("../../../src/helpers/battleEngineFacade.js");
    battleFacade.getPointsToWin.mockReturnValue(-3);
    const header = document.getElementById("cli-round");
    if (header) {
      header.textContent = "Round 3 Target: 5";
    }
    const { syncWinTargetDropdown } = await import(
      "../../../src/helpers/classicBattle/winTargetSync.js"
    );

    syncWinTargetDropdown();

    const select = document.getElementById("points-select");
    expect(select?.value).toBe("5");
    const options = Array.from(select?.options ?? []).map((option) => option.value);
    expect(options).not.toContain("-3");
    expect(document.getElementById("cli-round")?.textContent).toBe("Round 3 Target: 5");
  });
});
