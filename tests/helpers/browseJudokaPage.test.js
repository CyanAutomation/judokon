import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createBrowseJudokaHarness } from "./integrationHarness.js";

const harness = createBrowseJudokaHarness();

beforeEach(async () => {
  await harness.setup();
});

describe("browseJudokaPage helpers", () => {
  it("country toggle controller toggles panel and loads flags once", async () => {
    const { createCountryToggleController, setupCountryToggle } = await import(
      "../../src/helpers/browse/setupCountryToggle.js"
    );

    const interactions = {
      reflect: 0,
      loads: 0,
      navigation: []
    };
    let open = false;
    let flagsLoaded = false;

    const adapter = {
      isPanelOpen: () => open,
      reflectPanelState: vi.fn(() => {
        interactions.reflect += 1;
      }),
      closePanel: vi.fn(() => {
        open = false;
      }),
      async loadFlags() {
        interactions.loads += 1;
        flagsLoaded = true;
      },
      hasFlags: () => flagsLoaded,
      handleArrowNavigation: (event) => {
        interactions.navigation.push(event.key);
      }
    };

    const controller = createCountryToggleController(adapter);

    open = true;
    await controller.handleToggle();
    expect(adapter.reflectPanelState).toHaveBeenCalledTimes(2);
    expect(interactions.loads).toBe(1);
    expect(controller.countriesLoaded()).toBe(true);

    open = false;
    await controller.handleToggle();
    expect(adapter.reflectPanelState).toHaveBeenCalledTimes(3);
    expect(interactions.loads).toBe(1);

    controller.handleKeydown({ key: "ArrowRight" });
    expect(interactions.navigation).toEqual(["ArrowRight"]);

    open = true;
    controller.handleKeydown({ key: "Escape" });
    expect(adapter.closePanel).toHaveBeenCalledTimes(1);

    const panelEvents = [];
    const toggleButton = {
      addEventListener: vi.fn()
    };
    const panel = {
      addEventListener: vi.fn((event, handler) => {
        panelEvents.push({ event, handler });
      })
    };

    const loaded = setupCountryToggle(toggleButton, panel, null, { adapter });

    expect(toggleButton.addEventListener).not.toHaveBeenCalled();
    expect(panel.addEventListener).toHaveBeenCalledWith("toggle", expect.any(Function));
    expect(panel.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));

    open = true;
    const toggleHandler = panelEvents.find(({ event }) => event === "toggle");
    await toggleHandler.handler();
    expect(adapter.reflectPanelState).toHaveBeenCalledTimes(4);

    open = true;
    const keydownHandler = panelEvents.find(({ event }) => event === "keydown");
    keydownHandler.handler({ key: "Escape" });
    expect(adapter.closePanel).toHaveBeenCalledTimes(2);

    expect(loaded()).toBe(true);
  });

  it("exposes a CSS-driven layout toggle hook", async () => {
    const markup = await readFile(join(process.cwd(), "src/pages/browseJudoka.html"), "utf8");
    const parser = new DOMParser();
    const doc = parser.parseFromString(markup, "text/html");

    const checkbox = doc.getElementById("layout-mode-toggle");
    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute("type")).toBe("checkbox");
    expect(checkbox?.nextElementSibling?.id).toBe("country-panel");
    expect(checkbox?.getAttribute("aria-hidden")).toBe("true");
    expect(checkbox?.getAttribute("tabindex")).toBe("-1");

    const label = doc.getElementById("layout-toggle");
    expect(label).not.toBeNull();
    expect(label?.getAttribute("for")).toBe("layout-mode-toggle");
    expect(label?.getAttribute("data-testid")).toBe("layout-toggle");
    expect(label?.getAttribute("aria-controls")).toBe("country-panel-content");
    expect(label?.getAttribute("aria-pressed")).toBe("false");
  });

  it("allows the accessible layout toggle to respond to keyboard activation", async () => {
    const markup = await readFile(join(process.cwd(), "src/pages/browseJudoka.html"), "utf8");
    const parser = new DOMParser();
    const doc = parser.parseFromString(markup, "text/html");

    const { createBrowsePageRuntime } = await import("../../src/helpers/browseJudokaPage.js");

    const runtime = createBrowsePageRuntime(doc);
    runtime.setupLayoutToggleControl?.();

    const label = doc.getElementById("layout-toggle");
    const checkbox = doc.getElementById("layout-mode-toggle");

    expect(label?.getAttribute("aria-pressed")).toBe("false");
    label?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(checkbox?.checked).toBe(true);
    expect(label?.getAttribute("aria-pressed")).toBe("true");

    label?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(checkbox?.checked).toBe(false);
    expect(label?.getAttribute("aria-pressed")).toBe("false");
  });

  it("country filter controller filters judoka and clears selection", async () => {
    vi.resetModules();
    const { createCountryFilterController } = await import(
      "../../src/helpers/browse/setupCountryFilter.js"
    );

    const judoka = [
      { id: 1, country: "JP" },
      { id: 2, country: "BR" }
    ];
    const renderCalls = [];
    const allRadio = document.createElement("input");
    allRadio.type = "radio";
    allRadio.name = "country-filter";
    allRadio.value = "all";
    allRadio.checked = true;
    const jpRadio = document.createElement("input");
    jpRadio.type = "radio";
    jpRadio.name = "country-filter";
    jpRadio.value = "JP";
    const caRadio = document.createElement("input");
    caRadio.type = "radio";
    caRadio.name = "country-filter";
    caRadio.value = "CA";

    const adapter = {
      updateLiveRegion: vi.fn(),
      closePanel: vi.fn(),
      removeNoResultsMessage: vi.fn(),
      showNoResultsMessage: vi.fn(),
      getButtonValue: (button) => button?.value ?? "all",
      getRadios: () => [allRadio, jpRadio, caRadio],
      getDefaultRadio: () => allRadio
    };
    const render = vi.fn((list) => {
      renderCalls.push(list.map((item) => item.country));
    });

    const controller = createCountryFilterController(judoka, render, adapter);

    const filtered = await controller.select(jpRadio);
    expect(filtered).toEqual([{ id: 1, country: "JP" }]);
    expect(jpRadio.checked).toBe(true);
    expect(render).toHaveBeenLastCalledWith([{ id: 1, country: "JP" }]);
    expect(adapter.updateLiveRegion).toHaveBeenLastCalledWith(1, "JP");
    expect(adapter.removeNoResultsMessage).toHaveBeenCalled();
    expect(adapter.closePanel).toHaveBeenCalled();

    adapter.showNoResultsMessage.mockClear();
    await controller.select(caRadio);
    expect(adapter.showNoResultsMessage).toHaveBeenCalledTimes(1);

    const cleared = await controller.clear();
    expect(cleared).toEqual(judoka);
    expect(render).toHaveBeenLastCalledWith(judoka);
    expect(adapter.updateLiveRegion).toHaveBeenLastCalledWith(2, "all countries");
    expect(allRadio.checked).toBe(true);
  });

  it("shows a spinner during load and removes it after rendering", async () => {
    vi.resetModules();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchJson = vi.fn((url) => {
      if (url.includes("judoka.json")) {
        return Promise.resolve([{ id: 1, country: "JP" }]);
      }
      return Promise.resolve([]);
    });

    const buildCardCarousel = vi.fn(async () => ({
      querySelector: vi.fn(() => ({}))
    }));

    const initScrollMarkers = vi.fn();

    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers
    }));

    const spinnerCalls = [];
    const runtime = {
      carouselContainer: {},
      ensurePanelHidden: vi.fn(),
      setupToggle: vi.fn(),
      createSpinnerController: vi.fn(() => ({
        show: vi.fn(() => spinnerCalls.push("show")),
        remove: vi.fn(() => spinnerCalls.push("remove"))
      })),
      renderCarousel: vi.fn(async () => ({ carousel: {}, containerEl: {} })),
      setupCountryFilter: vi.fn(),
      appendNoResultsMessage: vi.fn(),
      markReady: vi.fn()
    };

    globalThis.__forceSpinner__ = true;

    const { setupBrowseJudokaPage } = await import("../../src/helpers/browseJudokaPage.js");

    await setupBrowseJudokaPage({ runtime });

    expect(runtime.ensurePanelHidden).toHaveBeenCalled();
    expect(runtime.setupToggle).toHaveBeenCalled();
    expect(runtime.createSpinnerController).toHaveBeenCalledWith(true);
    expect(spinnerCalls).toEqual(["show", "remove"]);
    expect(runtime.renderCarousel).toHaveBeenCalledWith([{ id: 1, country: "JP" }], []);
    expect(runtime.setupCountryFilter).toHaveBeenCalledWith(
      [{ id: 1, country: "JP" }],
      expect.any(Function)
    );
    expect(runtime.markReady).toHaveBeenCalled();

    expect(globalThis.__forceSpinner__).toBeUndefined();
    consoleErrorSpy.mockRestore();
  });

  it("renders a fallback card when judoka data fails to load", async () => {
    vi.resetModules();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchJson = vi.fn((url) => {
      if (url.includes("judoka.json")) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve([]);
    });

    const buildCardCarousel = vi.fn(async () => ({
      querySelector: vi.fn(() => ({}))
    }));

    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers: vi.fn()
    }));
    vi.doMock("../../src/helpers/judokaUtils.js", () => ({
      getFallbackJudoka: vi.fn(async () => ({ id: 0, firstname: "Fallback" }))
    }));

    const runtime = {
      carouselContainer: {},
      ensurePanelHidden: vi.fn(),
      setupToggle: vi.fn(),
      createSpinnerController: vi.fn(() => ({
        show: vi.fn(),
        remove: vi.fn()
      })),
      renderCarousel: vi.fn(async () => ({ carousel: {}, containerEl: {} })),
      appendErrorMessage: vi.fn(),
      appendRetryButton: vi.fn(),
      markReady: vi.fn()
    };

    const retryButton = { disabled: false };
    runtime.appendRetryButton.mockImplementation((handler) => {
      retryButton.onClick = handler;
      return retryButton;
    });

    const { setupBrowseJudokaPage } = await import("../../src/helpers/browseJudokaPage.js");

    await setupBrowseJudokaPage({ runtime });

    expect(runtime.renderCarousel).toHaveBeenCalledWith([{ id: 0, firstname: "Fallback" }], []);
    expect(runtime.appendErrorMessage).toHaveBeenCalled();
    expect(runtime.appendRetryButton).toHaveBeenCalledWith(expect.any(Function));

    fetchJson.mockImplementation((url) => {
      if (url.includes("judoka.json")) {
        return Promise.resolve([{ id: 1, country: "JP" }]);
      }
      return Promise.resolve([]);
    });

    await retryButton.onClick();
    expect(runtime.renderCarousel).toHaveBeenLastCalledWith([{ id: 1, country: "JP" }], []);

    consoleErrorSpy.mockRestore();
  });
});
