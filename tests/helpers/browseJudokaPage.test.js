import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";
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
      loads: 0
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
      hasFlags: () => flagsLoaded
    };

    const controller = createCountryToggleController(adapter);

    open = true;
    await controller.handleToggle();
    expect(adapter.reflectPanelState).toHaveBeenCalledTimes(1);
    expect(interactions.loads).toBe(1);
    expect(controller.countriesLoaded()).toBe(true);

    open = false;
    await controller.handleToggle();
    expect(adapter.reflectPanelState).toHaveBeenCalledTimes(2);
    expect(interactions.loads).toBe(1);

    open = true;
    controller.handleKeydown({ key: "Escape" });
    expect(adapter.closePanel).toHaveBeenCalledTimes(1);

    const panelEvents = [];
    const toggleButton = {
      addEventListener: vi.fn()
    };
    const documentEvents = [];
    const panel = {
      addEventListener: vi.fn((event, handler) => {
        panelEvents.push({ event, handler });
      }),
      ownerDocument: {
        addEventListener: vi.fn((event, handler) => {
          documentEvents.push({ event, handler });
        })
      }
    };

    const loaded = setupCountryToggle(toggleButton, panel, null, { adapter });

    expect(toggleButton.addEventListener).not.toHaveBeenCalled();
    expect(panel.addEventListener).toHaveBeenCalledWith("toggle", expect.any(Function));
    expect(panel.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(panel.ownerDocument.addEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      { capture: true }
    );

    open = true;
    const toggleHandler = panelEvents.find(({ event }) => event === "toggle");
    await toggleHandler.handler();
    expect(adapter.reflectPanelState).toHaveBeenCalledTimes(3);

    open = true;
    const keydownHandler = panelEvents.find(({ event }) => event === "keydown");
    keydownHandler.handler({ key: "Escape" });
    expect(adapter.closePanel).toHaveBeenCalledTimes(2);

    expect(documentEvents).toHaveLength(1);
    const docKeydownHandler = documentEvents[0]?.handler;
    open = true;
    docKeydownHandler?.({ key: "Escape" });
    expect(adapter.closePanel).toHaveBeenCalledTimes(3);

    expect(loaded()).toBe(true);
  });

  it("exposes the layout mode checkbox as the interactive control", async () => {
    const markup = await readFile(join(process.cwd(), "src/pages/browseJudoka.html"), "utf8");
    const dom = new JSDOM(markup, { pretendToBeVisual: true });
    const { document } = dom.window;

    const checkbox = document.getElementById("layout-mode-toggle");
    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute("type")).toBe("checkbox");
    expect(checkbox?.getAttribute("aria-hidden")).toBeNull();
    expect(checkbox?.getAttribute("tabindex")).toBeNull();
    expect(checkbox?.getAttribute("aria-label")).toBe("Toggle layout");
    expect(checkbox?.getAttribute("data-tooltip-id")).toBe("ui.toggleLayout");
    expect(checkbox?.nextElementSibling?.id).toBe("country-panel");

    const surrogate = document.getElementById("layout-toggle");
    expect(surrogate).toBeNull();
  });

  it("lets users focus and toggle the layout checkbox without extra helpers", async () => {
    const markup = await readFile(join(process.cwd(), "src/pages/browseJudoka.html"), "utf8");
    const dom = new JSDOM(markup, { pretendToBeVisual: true });
    const { document, KeyboardEvent } = dom.window;

    const checkbox = document.getElementById("layout-mode-toggle");
    expect(checkbox).not.toBeNull();

    checkbox?.focus();
    expect(document.activeElement).toBe(checkbox);

    const keyEvents = [];
    checkbox?.addEventListener("keydown", (event) => {
      keyEvents.push({ key: event.key, defaultPrevented: event.defaultPrevented });
    });

    checkbox?.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true })
    );

    expect(keyEvents).toEqual([{ key: " ", defaultPrevented: false }]);
    expect(checkbox?.checked).toBe(false);

    checkbox?.click();
    expect(checkbox?.checked).toBe(true);

    checkbox?.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true })
    );

    expect(keyEvents).toEqual([
      { key: " ", defaultPrevented: false },
      { key: " ", defaultPrevented: false }
    ]);

    checkbox?.click();
    expect(checkbox?.checked).toBe(false);

    const { createBrowsePageRuntime } = await import("../../src/helpers/browseJudokaPage.js");
    const runtime = createBrowsePageRuntime(document);
    expect(runtime.setupLayoutToggleControl).toBeUndefined();
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

  it("filters the carousel when a flag label is clicked", async () => {
    vi.resetModules();
    const { setupCountryFilter } = await import("../../src/helpers/browse/setupCountryFilter.js");

    const root = document.createElement("div");
    document.body.appendChild(root);

    const listContainer = document.createElement("div");
    listContainer.id = "country-list";
    const fieldset = document.createElement("fieldset");
    fieldset.dataset.countryFilter = "";
    listContainer.appendChild(fieldset);
    root.appendChild(listContainer);

    const makeOption = (value, labelText, checked = false) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "country-filter";
      input.id = `country-filter-${value.toLowerCase()}`;
      input.value = value;
      input.checked = checked;
      const label = document.createElement("label");
      label.className = "flag-button";
      label.setAttribute("for", input.id);
      const text = document.createElement("span");
      text.textContent = labelText;
      label.appendChild(text);
      fieldset.append(input, label);
      return { input, label };
    };

    makeOption("all", "All", true);
    const { input: japanRadio, label: japanLabel } = makeOption("Japan", "Japan");
    const { input: brazilRadio } = makeOption("Brazil", "Brazil");

    const clearButton = document.createElement("button");
    const toggleButton = document.createElement("button");
    const panel = document.createElement("details");
    panel.className = "country-panel";
    panel.open = true;
    const panelContent = document.createElement("div");
    panelContent.className = "country-panel__content";
    panel.appendChild(panelContent);
    root.appendChild(panel);

    const carouselEl = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-container";
    const liveRegion = document.createElement("div");
    liveRegion.className = "carousel-aria-live";
    const cardContainer = document.createElement("div");
    cardContainer.className = "card-carousel";
    cardContainer.scrollLeft = 120;
    cardContainer.scrollTo = vi.fn(({ left }) => {
      cardContainer.scrollLeft = left;
    });
    const controller = { setPage: vi.fn() };
    wrapper._carouselController = controller;
    wrapper.append(liveRegion, cardContainer);
    carouselEl.appendChild(wrapper);
    root.appendChild(carouselEl);

    const judokaList = [
      { id: 1, country: "Japan" },
      { id: 2, country: "Brazil" }
    ];
    const render = vi.fn().mockImplementation(async () => ({
      carousel: wrapper,
      containerEl: cardContainer
    }));

    setupCountryFilter(
      listContainer,
      clearButton,
      judokaList,
      render,
      toggleButton,
      panel,
      carouselEl,
      liveRegion
    );

    japanLabel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(japanRadio.checked).toBe(true);
    expect(panel.open).toBe(false);
    expect(render).toHaveBeenCalled();
    expect(render.mock.calls.at(-1)?.[0]).toEqual([{ id: 1, country: "Japan" }]);
    expect(controller.setPage).toHaveBeenCalledTimes(1);
    expect(controller.setPage).toHaveBeenCalledWith(0);
    expect(cardContainer.scrollLeft).toBe(0);
    expect(cardContainer.scrollTo).toHaveBeenCalled();

    controller.setPage.mockClear();
    cardContainer.scrollTo.mockClear();
    cardContainer.scrollLeft = 200;
    render.mockClear();
    panel.open = true;
    brazilRadio.checked = true;
    japanRadio.checked = false;
    brazilRadio.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenLastCalledWith([{ id: 2, country: "Brazil" }]);
    expect(controller.setPage).toHaveBeenCalledTimes(1);
    expect(controller.setPage).toHaveBeenCalledWith(0);
    expect(cardContainer.scrollLeft).toBe(0);
    expect(cardContainer.scrollTo).toHaveBeenCalled();

    root.remove();
  });

  it("shows and clears the no-results message when a filter yields no matches", async () => {
    vi.resetModules();
    const { setupCountryFilter } = await import("../../src/helpers/browse/setupCountryFilter.js");

    const root = document.createElement("div");
    document.body.appendChild(root);

    const listContainer = document.createElement("div");
    listContainer.id = "country-list";
    const fieldset = document.createElement("fieldset");
    fieldset.dataset.countryFilter = "";
    listContainer.appendChild(fieldset);
    root.appendChild(listContainer);

    const makeOption = (value, labelText, checked = false) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "country-filter";
      input.id = `country-filter-${value.toLowerCase().replace(/\s+/g, "-")}`;
      input.value = value;
      input.checked = checked;
      const label = document.createElement("label");
      label.className = "flag-button";
      label.setAttribute("for", input.id);
      const text = document.createElement("span");
      text.textContent = labelText;
      label.appendChild(text);
      fieldset.append(input, label);
      return { input, label };
    };

    const { input: allRadio, label: allLabel } = makeOption("all", "All", true);
    const { input: japanRadio } = makeOption("Japan", "Japan");
    const { label: canadaLabel } = makeOption("Canada", "Canada");

    const clearButton = document.createElement("button");
    const toggleButton = document.createElement("button");
    const panel = document.createElement("details");
    panel.className = "country-panel";
    panel.open = true;
    const panelContent = document.createElement("div");
    panelContent.className = "country-panel__content";
    panel.appendChild(panelContent);
    root.appendChild(panel);

    const carouselEl = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-container";
    const liveRegion = document.createElement("div");
    liveRegion.className = "carousel-aria-live";
    const cardContainer = document.createElement("div");
    cardContainer.className = "card-carousel";
    cardContainer.scrollLeft = 40;
    cardContainer.scrollTo = vi.fn(({ left }) => {
      cardContainer.scrollLeft = left;
    });
    const controller = { setPage: vi.fn() };
    wrapper._carouselController = controller;
    wrapper.append(liveRegion, cardContainer);
    carouselEl.appendChild(wrapper);
    root.appendChild(carouselEl);

    const judokaList = [
      { id: 1, country: "Japan" },
      { id: 2, country: "Brazil" }
    ];
    const render = vi.fn().mockImplementation(async (list) => {
      // Simulate clearing the carousel container before populating new cards
      cardContainer.replaceChildren();
      for (const entry of list) {
        const card = document.createElement("article");
        card.className = "judoka-card";
        card.dataset.country = entry.country;
        cardContainer.appendChild(card);
      }
      return { carousel: wrapper, containerEl: cardContainer };
    });

    setupCountryFilter(
      listContainer,
      clearButton,
      judokaList,
      render,
      toggleButton,
      panel,
      carouselEl,
      liveRegion
    );

    canadaLabel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(render).toHaveBeenLastCalledWith([]);
    expect(controller.setPage).toHaveBeenCalledWith(0);
    const noResults = carouselEl.querySelector(".no-results-message");
    expect(noResults).not.toBeNull();
    expect(noResults?.textContent).toBe("No judoka found");
    expect(liveRegion.textContent).toBe("Showing 0 judoka for Canada");

    render.mockClear();
    controller.setPage.mockClear();
    cardContainer.scrollTo.mockClear();
    panel.open = true;
    japanRadio.checked = true;
    allRadio.checked = false;
    japanRadio.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(render).toHaveBeenLastCalledWith([{ id: 1, country: "Japan" }]);
    expect(carouselEl.querySelector(".no-results-message")).toBeNull();
    expect(controller.setPage).toHaveBeenCalledWith(0);
    expect(cardContainer.scrollLeft).toBe(0);
    expect(liveRegion.textContent).toBe("Showing 1 judoka for Japan");

    render.mockClear();
    controller.setPage.mockClear();
    cardContainer.scrollTo.mockClear();
    allLabel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(render).toHaveBeenLastCalledWith(judokaList);
    expect(controller.setPage).toHaveBeenCalledWith(0);
    expect(carouselEl.querySelector(".no-results-message")).toBeNull();
    expect(liveRegion.textContent).toBe("Showing 2 judoka for all countries");

    root.remove();
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

  it("surfaces a message when fallback judoka cannot be loaded", async () => {
    vi.resetModules();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchJson = vi.fn((url) => {
      if (url.includes("judoka.json")) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve([]);
    });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel: vi.fn(),
      initScrollMarkers: vi.fn()
    }));
    vi.doMock("../../src/helpers/judokaUtils.js", () => ({
      getFallbackJudoka: vi.fn(async () => {
        throw new Error("fallback fail");
      })
    }));

    const container = {
      replaceChildren: vi.fn(),
      querySelector: vi.fn(() => null)
    };

    const runtime = {
      carouselContainer: container,
      ensurePanelHidden: vi.fn(),
      setupToggle: vi.fn(),
      createSpinnerController: vi.fn(() => ({
        show: vi.fn(),
        remove: vi.fn()
      })),
      renderCarousel: vi.fn(async () => ({ carousel: {}, containerEl: {} })),
      appendErrorMessage: vi.fn(),
      appendNoResultsMessage: vi.fn(),
      appendRetryButton: vi.fn(),
      markReady: vi.fn()
    };

    let retryHandler;
    const retryButton = { disabled: false };
    runtime.appendRetryButton.mockImplementation((handler) => {
      retryHandler = handler;
      return retryButton;
    });

    const { setupBrowseJudokaPage } = await import("../../src/helpers/browseJudokaPage.js");

    await setupBrowseJudokaPage({ runtime });

    expect(runtime.renderCarousel).not.toHaveBeenCalled();
    expect(container.replaceChildren).toHaveBeenCalledTimes(1);
    expect(runtime.appendNoResultsMessage).toHaveBeenCalledTimes(1);
    expect(runtime.appendErrorMessage).toHaveBeenCalledTimes(1);
    expect(runtime.appendRetryButton).toHaveBeenCalledWith(expect.any(Function));

    fetchJson.mockImplementation((url) => {
      if (url.includes("judoka.json")) {
        return Promise.resolve([{ id: 9, country: "FR" }]);
      }
      return Promise.resolve([]);
    });

    await retryHandler?.();

    expect(runtime.renderCarousel).toHaveBeenLastCalledWith([{ id: 9, country: "FR" }], []);
    expect(retryButton.disabled).toBe(false);
    expect(runtime.appendErrorMessage).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });
});
