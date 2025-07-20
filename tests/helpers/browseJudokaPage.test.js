import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("browseJudokaPage helpers", () => {
  it("setupCountryToggle toggles panel and loads flags once", async () => {
    const toggleCountryPanel = vi.fn();
    const createCountrySlider = vi.fn();

    vi.doMock("../../src/helpers/domReady.js", () => ({
      onDomReady: vi.fn()
    }));

    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode: vi.fn()
    }));
    vi.doMock("../../src/helpers/countrySlider.js", () => ({
      createCountrySlider
    }));

    const { setupCountryToggle } = await import("../../src/helpers/browseJudokaPage.js");

    const toggleBtn = document.createElement("button");
    const panel = document.createElement("div");
    const list = document.createElement("div");
    const first = document.createElement("button");
    first.className = "flag-button";
    const second = document.createElement("button");
    second.className = "flag-button";
    list.append(first, second);
    document.body.append(toggleBtn, panel, list);

    setupCountryToggle(toggleBtn, panel, list);

    toggleBtn.click();
    await Promise.resolve();
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel);
    expect(createCountrySlider).toHaveBeenCalledTimes(1);

    toggleBtn.click();
    await Promise.resolve();
    expect(createCountrySlider).toHaveBeenCalledTimes(1);

    first.focus();
    const arrowEvent = new KeyboardEvent("keydown", { key: "ArrowRight" });
    panel.dispatchEvent(arrowEvent);
    await Promise.resolve();
    expect(document.activeElement).toBe(second);

    const escEvent = new KeyboardEvent("keydown", { key: "Escape" });
    panel.dispatchEvent(escEvent);
    await Promise.resolve();
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel, false);
  });

  it("setupLayoutToggle switches panel mode", async () => {
    const toggleCountryPanelMode = vi.fn();
    const toggleCountryPanel = vi.fn();

    vi.doMock("../../src/helpers/domReady.js", () => ({
      onDomReady: vi.fn()
    }));

    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode
    }));

    const { setupLayoutToggle } = await import("../../src/helpers/browseJudokaPage.js");

    const button = document.createElement("button");
    const panel = document.createElement("div");
    document.body.append(button, panel);

    setupLayoutToggle(button, panel);
    button.click();
    await Promise.resolve();

    expect(toggleCountryPanelMode).toHaveBeenCalledWith(panel);

    expect(() => setupLayoutToggle(null, panel)).not.toThrow();
  });

  it("setupCountryFilter filters judoka and clears selection", async () => {
    const toggleCountryPanel = vi.fn();

    vi.doMock("../../src/helpers/domReady.js", () => ({
      onDomReady: vi.fn()
    }));

    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode: vi.fn()
    }));

    const { setupCountryFilter } = await import("../../src/helpers/browseJudokaPage.js");

    const list = document.createElement("div");
    const allBtn = document.createElement("button");
    allBtn.className = "flag-button";
    allBtn.value = "all";
    const jpBtn = document.createElement("button");
    jpBtn.className = "flag-button";
    jpBtn.value = "JP";
    list.append(allBtn, jpBtn);

    const clear = document.createElement("button");
    const panel = document.createElement("div");
    const toggleBtn = document.createElement("button");
    const carousel = document.createElement("div");
    document.body.append(list, clear, panel, toggleBtn, carousel);

    const judoka = [
      { id: 1, country: "JP" },
      { id: 2, country: "BR" }
    ];
    const render = vi.fn();

    setupCountryFilter(list, clear, judoka, render, toggleBtn, panel, carousel);

    jpBtn.click();
    await Promise.resolve();
    expect(jpBtn.classList.contains("selected")).toBe(true);
    expect(render).toHaveBeenLastCalledWith([{ id: 1, country: "JP" }]);

    clear.click();
    await Promise.resolve();
    expect(allBtn.classList.contains("selected")).toBe(false);
    expect(jpBtn.classList.contains("selected")).toBe(false);
    expect(render).toHaveBeenLastCalledWith(judoka);
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel, false);
  });
});
