import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  getPointsToWin: vi.fn()
}));

function renderCliDom() {
  const cliRoot = document.createElement("div");
  cliRoot.id = "cli-root";
  cliRoot.dataset.round = "3";
  cliRoot.dataset.target = "5";

  const roundCounter = document.createElement("p");
  roundCounter.id = "round-counter";
  roundCounter.textContent = "Round 3 Target: 5";
  roundCounter.dataset.target = "5";

  const select = document.createElement("select");
  select.id = "points-select";
  [3, 5].forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    select.append(option);
  });
  select.value = "5";

  document.body.replaceChildren(cliRoot, roundCounter, select);
  document.body.dataset.target = "5";

  return { cliRoot, roundCounter, select };
}

describe("syncWinTargetDropdown", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    renderCliDom();
  });

  it("injects missing target option and updates header metadata", async () => {
    const battleFacade = await import("../../../src/helpers/BattleEngine.js");
    battleFacade.getPointsToWin.mockReturnValue(7);
    const { syncWinTargetDropdown } = await import(
      "../../../src/helpers/classicBattle/winTargetSync.js"
    );

    syncWinTargetDropdown();

    const select = document.getElementById("points-select");
    expect(select?.value).toBe("7");
    const options = Array.from(select?.options ?? []).map((option) => option.value);
    expect(options).toContain("7");
    expect(document.getElementById("round-counter")?.textContent).toBe("Round 3 Target: 7");
    expect(document.getElementById("cli-root")?.dataset.target).toBe("7");
  });

  it("falls back to stored dataset target when facade target is invalid", async () => {
    const battleFacade = await import("../../../src/helpers/BattleEngine.js");
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
    expect(document.getElementById("round-counter")?.textContent).toBe("Round 3 Target: 11");
    expect(document.getElementById("cli-root")?.dataset.target).toBe("11");
  });

  it("ignores invalid targets that would not render in the dropdown", async () => {
    const battleFacade = await import("../../../src/helpers/BattleEngine.js");
    battleFacade.getPointsToWin.mockReturnValue(-3);
    const header = document.getElementById("round-counter");
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
    expect(document.getElementById("round-counter")?.textContent).toBe("Round 3 Target: 5");
  });
});
