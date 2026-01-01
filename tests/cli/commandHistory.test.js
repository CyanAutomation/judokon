import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const STAT_KEYS = ["power", "speed", "technique"];

describe("Battle CLI command history preview", () => {
  let ensureCliDomForTest;
  let selectStat;
  let handleCommandHistory;
  let handleStatListArrowKey;
  let cliState;

  /**
   * Populate `#cli-stats` with minimal stat rows for tests.
   *
   * @returns {void}
   */
  function seedStatRows() {
    const list = document.getElementById("cli-stats");
    if (!list) throw new Error("cli-stats list missing");
    list.innerHTML = "";
    list.dataset.skeleton = "false";
    list.setAttribute("aria-busy", "false");
    STAT_KEYS.forEach((stat, index) => {
      const div = document.createElement("div");
      div.className = "cli-stat";
      div.dataset.stat = stat;
      div.dataset.statIndex = String(index + 1);
      div.id = `cli-stat-${index + 1}`;
      div.setAttribute("role", "option");
      div.setAttribute("aria-selected", "false");
      div.tabIndex = index === 0 ? 0 : -1;
      div.textContent = `[${index + 1}] ${stat}`;
      list.appendChild(div);
    });
  }

  beforeEach(async () => {
    vi.resetModules();
    if (!globalThis.window) {
      globalThis.window = globalThis;
    }
    if (!window.localStorage) {
      const store = new Map();
      const storage = {
        get length() {
          return store.size;
        },
        clear() {
          store.clear();
        },
        getItem(key) {
          return store.has(key) ? store.get(key) : null;
        },
        key(index) {
          return Array.from(store.keys())[index] ?? null;
        },
        removeItem(key) {
          store.delete(key);
        },
        setItem(key, value) {
          store.set(String(key), String(value));
        }
      };
      Object.defineProperty(window, "localStorage", {
        value: storage,
        configurable: true
      });
    }
    if (!globalThis.localStorage) {
      globalThis.localStorage = window.localStorage;
    }
    window.__TEST__ = true;

    const module = await import("../../src/pages/battleCLI/init.js");
    ensureCliDomForTest = module.ensureCliDomForTest;
    selectStat = module.selectStat;
    handleCommandHistory = module.handleCommandHistory;
    handleStatListArrowKey = module.handleStatListArrowKey;
    cliState = (await import("../../src/pages/battleCLI/state.js")).default;
    ensureCliDomForTest({ reset: true });
    seedStatRows();
    handleStatListArrowKey("ArrowDown");
  });

  afterEach(() => {
    window.localStorage?.clear?.();
    document.body.innerHTML = "";
  });

  it("highlights previous selections and restores the anchor", () => {
    selectStat("power");
    cliState.roundResolving = false;
    selectStat("speed");
    cliState.roundResolving = false;

    const list = document.getElementById("cli-stats");
    const snackbar = document.querySelector("#snackbar-container .snackbar");

    expect(handleCommandHistory("ArrowUp")).toBe(true);
    expect(list.dataset.historyPreview).toBe("speed");
    expect(list.querySelector(".history-preview")?.dataset.stat).toBe("speed");
    expect(snackbar?.textContent).toBe("History: speed");
    expect(snackbar).toBeTruthy();

    expect(handleCommandHistory("ArrowUp")).toBe(true);
    expect(list.dataset.historyPreview).toBe("power");
    expect(list.querySelector(".history-preview")?.dataset.stat).toBe("power");

    expect(handleCommandHistory("ArrowDown")).toBe(true);
    expect(list.dataset.historyPreview).toBe("speed");

    expect(handleCommandHistory("ArrowDown")).toBe(true);
    expect(list.dataset.historyPreview).toBeUndefined();
    expect(list.querySelector(".history-preview")).toBeNull();
    expect(snackbar?.textContent).toBe("");

    const activeId = list.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId || "")?.dataset.stat).toBe("speed");
  });
});
