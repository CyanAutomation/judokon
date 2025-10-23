import { describe, it, expect, vi, beforeEach } from "vitest";
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
      toggle: [],
      loads: 0,
      navigation: []
    };
    let open = false;
    let flagsLoaded = false;

    const adapter = {
      isPanelOpen: () => open,
      togglePanel: (force) => {
        interactions.toggle.push(force);
        if (typeof force === "boolean") {
          open = force;
        } else {
          open = !open;
        }
      },
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

    await controller.handleToggle();
    expect(interactions.toggle).toEqual([undefined]);
    expect(interactions.loads).toBe(1);
    expect(controller.countriesLoaded()).toBe(true);

    await controller.handleToggle();
    expect(interactions.toggle).toEqual([undefined, undefined]);
    expect(interactions.loads).toBe(1);

    controller.handleKeydown({ key: "ArrowRight" });
    expect(interactions.navigation).toEqual(["ArrowRight"]);

    controller.handleKeydown({ key: "Escape" });
    expect(interactions.toggle).toEqual([undefined, undefined, false]);

    const toggleEvents = [];
    const keyEvents = [];
    const toggleButton = {
      addEventListener: vi.fn((event, handler) => {
        toggleEvents.push({ event, handler });
      })
    };
    const panel = {
      addEventListener: vi.fn((event, handler) => {
        keyEvents.push({ event, handler });
      })
    };

    const loaded = setupCountryToggle(toggleButton, panel, null, { adapter });

    expect(toggleButton.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(panel.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));

    await toggleEvents[0].handler();
    expect(interactions.toggle).toEqual([undefined, undefined, false, undefined]);

    keyEvents[0].handler({ key: "Escape" });
    expect(interactions.toggle).toEqual([undefined, undefined, false, undefined, false]);

    expect(loaded()).toBe(true);
  });

  it("setupLayoutToggle switches panel mode", async () => {
    const toggleCountryPanelMode = vi.fn();
    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel: vi.fn(),
      toggleCountryPanelMode
    }));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { setupLayoutToggle } = await import("../../src/helpers/browseJudokaPage.js");

    const handlers = {};
    const button = {
      addEventListener: vi.fn((event, handler) => {
        handlers[event] = handler;
      })
    };
    const panel = {};

    setupLayoutToggle(button, panel);
    expect(button.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));

    handlers.click();
    expect(toggleCountryPanelMode).toHaveBeenCalledWith(panel);

    consoleErrorSpy.mockRestore();
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
    const fieldset = document.createElement("fieldset");
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
    fieldset.append(allRadio, jpRadio, caRadio);

    const adapter = {
      updateLiveRegion: vi.fn(),
      closePanel: vi.fn(),
      removeNoResultsMessage: vi.fn(),
      showNoResultsMessage: vi.fn(),
      getButtonValue: (button) => button?.value ?? "all",
      getAllRadio: vi.fn(() => allRadio),
      getCheckedRadio: vi.fn(() =>
        fieldset.querySelector('[type="radio"][name="country-filter"]:checked')
      )
    };
    const render = vi.fn((list) => {
      renderCalls.push(list.map((item) => item.country));
    });

    const controller = createCountryFilterController(judoka, render, adapter);

    jpRadio.checked = true;
    const filtered = await controller.select(jpRadio);
    expect(filtered).toEqual([{ id: 1, country: "JP" }]);
    expect(render).toHaveBeenLastCalledWith([{ id: 1, country: "JP" }]);
    expect(adapter.updateLiveRegion).toHaveBeenLastCalledWith(1, "JP");
    expect(adapter.removeNoResultsMessage).toHaveBeenCalled();
    expect(adapter.closePanel).toHaveBeenCalled();

    adapter.showNoResultsMessage.mockClear();
    caRadio.checked = true;
    await controller.select(caRadio);
    expect(adapter.showNoResultsMessage).toHaveBeenCalledTimes(1);

    const cleared = await controller.clear();
    expect(cleared).toEqual(judoka);
    expect(allRadio.checked).toBe(true);
    expect(render).toHaveBeenLastCalledWith(judoka);
    expect(adapter.updateLiveRegion).toHaveBeenLastCalledWith(2, "all countries");
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
      setupLayoutToggle: vi.fn(),
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
    expect(runtime.setupLayoutToggle).toHaveBeenCalled();
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
