import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import installRAFMock from "../helpers/rafMock.js";

let __browseRafRestore;
beforeEach(() => {
  const raf = installRAFMock();
  __browseRafRestore = raf.restore;
});
afterEach(() => {
  try {
    __browseRafRestore?.();
  } catch {}
});

describe("browseJudokaPage helpers", () => {
  it("setupCountryToggle toggles panel and loads flags once", async () => {
    const toggleCountryPanel = vi.fn();
    const createCountrySlider = vi.fn(async (container) => {
      const first = document.createElement("button");
      first.className = "flag-button";
      const second = document.createElement("button");
      second.className = "flag-button";
      container.append(first, second);
    });

    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode: vi.fn()
    }));
    vi.doMock("../../src/helpers/countrySlider.js", () => ({
      createCountrySlider
    }));

    const { setupCountryToggle, handleToggleClick, handlePanelKeydown } = await import(
      "../../src/helpers/browse/setupCountryToggle.js"
    );

    const toggleBtn = document.createElement("button");
    const panel = document.createElement("div");
    const list = document.createElement("div");
    document.body.append(toggleBtn, panel, list);

    const countriesLoaded = setupCountryToggle(toggleBtn, panel, list);

    await handleToggleClick(toggleBtn, panel, list);
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel);
    expect(createCountrySlider).toHaveBeenCalledTimes(1);
    expect(countriesLoaded()).toBe(true);

    await handleToggleClick(toggleBtn, panel, list);
    expect(createCountrySlider).toHaveBeenCalledTimes(1);

    const first = list.querySelectorAll("button.flag-button")[0];
    const second = list.querySelectorAll("button.flag-button")[1];
    first.focus();
    handlePanelKeydown({ key: "ArrowRight", preventDefault: vi.fn() }, toggleBtn, panel, list);
    expect(document.activeElement).toBe(second);

    handlePanelKeydown({ key: "Escape" }, toggleBtn, panel, list);
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

    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode: vi.fn()
    }));

    const { applyCountryFilter, clearCountryFilter } = await import(
      "../../src/helpers/browse/setupCountryFilter.js"
    );

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
    const ariaLive = document.createElement("div");
    ariaLive.className = "carousel-aria-live";
    carousel.appendChild(ariaLive);
    document.body.append(list, clear, panel, toggleBtn, carousel);

    const judoka = [
      { id: 1, country: "JP" },
      { id: 2, country: "BR" }
    ];
    const render = vi.fn();

    const updateLiveRegion = (count, country) => {
      ariaLive.textContent = `Showing ${count} judoka for ${country}`;
    };

    await applyCountryFilter(
      jpBtn,
      list,
      judoka,
      render,
      toggleBtn,
      panel,
      carousel,
      updateLiveRegion
    );
    expect(jpBtn.classList.contains("selected")).toBe(true);
    expect(render).toHaveBeenLastCalledWith([{ id: 1, country: "JP" }]);
    expect(ariaLive.textContent).toBe("Showing 1 judoka for JP");
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel, false);

    await clearCountryFilter(list, judoka, render, toggleBtn, panel, updateLiveRegion);
    expect(allBtn.classList.contains("selected")).toBe(false);
    expect(jpBtn.classList.contains("selected")).toBe(false);
    expect(render).toHaveBeenLastCalledWith(judoka);
    expect(toggleCountryPanel).toHaveBeenCalledTimes(2);
    expect(ariaLive.textContent).toBe("Showing 2 judoka for all countries");
  });

  it("shows a spinner during load and removes it after rendering", async () => {
    const fetchResolvers = [];
    const fetchJson = vi.fn(() => new Promise((resolve) => fetchResolvers.push(resolve)));

    const buildCardCarousel = vi.fn(async () => {
      const wrapper = document.createElement("div");
      const ariaLive = document.createElement("div");
      ariaLive.className = "carousel-aria-live";
      const inner = document.createElement("div");
      inner.className = "card-carousel";
      wrapper.append(ariaLive, inner);
      return wrapper;
    });

    let show;
    let remove;
    const createSpinner = (wrapper) => {
      const element = document.createElement("div");
      element.className = "loading-spinner";
      wrapper.appendChild(element);
      show = vi.fn();
      remove = vi.fn(() => element.remove());
      return {
        element,
        show,
        hide: vi.fn(),
        remove
      };
    };

    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers: vi.fn()
    }));
    vi.doMock("../../src/components/Spinner.js", () => ({ createSpinner }));
    vi.doMock("../../src/helpers/buttonEffects.js", () => ({ setupButtonEffects: vi.fn() }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const toggleCountryPanel = vi.fn();
    const toggleCountryPanelMode = vi.fn();
    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode
    }));
    vi.doMock("../../src/helpers/countrySlider.js", () => ({ createCountrySlider: vi.fn() }));

    const { setupBrowseJudokaPage } = await import("../../src/helpers/browseJudokaPage.js");

    const carousel = document.createElement("div");
    carousel.id = "carousel-container";
    const list = document.createElement("div");
    list.id = "country-list";
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "country-toggle";
    const layoutBtn = document.createElement("button");
    layoutBtn.id = "layout-toggle";
    const panel = document.createElement("div");
    panel.id = "country-panel";
    const clear = document.createElement("button");
    clear.id = "clear-filter";
    document.body.append(carousel, list, toggleBtn, layoutBtn, panel, clear);

    globalThis.__forceSpinner__ = true;
    const pagePromise = setupBrowseJudokaPage();

    const spinnerEl = carousel.querySelector(".loading-spinner");
    expect(spinnerEl).not.toBeNull();
    expect(spinnerEl.style.display).toBe("block");
    expect(show).toHaveBeenCalled();

    fetchResolvers[0]([{ id: 1, country: "JP" }]);
    fetchResolvers[1]([]);
    await pagePromise;

    // Ensure any queued RAF callbacks run (existing tests used immediate RAF)
    if (typeof globalThis.flushRAF === "function") {
      globalThis.flushRAF();
    }

    expect(carousel.querySelector(".loading-spinner")).toBeNull();
    expect(remove).toHaveBeenCalled();
    expect(toggleCountryPanelMode).toHaveBeenCalledWith(panel, false);
    delete globalThis.__forceSpinner__;
  });

  it("renders a fallback card when judoka data fails to load", async () => {
    // Use queued RAF mock installed in beforeEach; we'll flush after setup if needed
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchJson = vi.fn((url) => {
      if (url.includes("judoka.json")) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve([]);
    });

    const buildCardCarousel = vi.fn(async (list) => {
      const wrapper = document.createElement("div");
      const ariaLive = document.createElement("div");
      ariaLive.className = "carousel-aria-live";
      const inner = document.createElement("div");
      inner.className = "card-carousel";
      const card = document.createElement("div");
      card.className = "judoka-card";
      card.setAttribute("data-judoka-name", list[0].firstname);
      inner.appendChild(card);
      wrapper.append(ariaLive, inner);
      return wrapper;
    });

    const getFallbackJudoka = vi.fn(async () => ({
      id: 0,
      firstname: "Fallback",
      surname: "Judoka"
    }));

    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers: vi.fn()
    }));
    vi.doMock("../../src/components/Spinner.js", () => ({
      createSpinner: () => ({
        element: document.createElement("div"),
        show: vi.fn(),
        hide: vi.fn(),
        remove: vi.fn()
      })
    }));
    vi.doMock("../../src/helpers/buttonEffects.js", () => ({ setupButtonEffects: vi.fn() }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const toggleCountryPanel = vi.fn();
    const toggleCountryPanelMode = vi.fn();
    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode
    }));
    vi.doMock("../../src/helpers/countrySlider.js", () => ({ createCountrySlider: vi.fn() }));
    vi.doMock("../../src/helpers/judokaUtils.js", () => ({ getFallbackJudoka }));

    const { setupBrowseJudokaPage } = await import("../../src/helpers/browseJudokaPage.js");

    const carousel = document.createElement("div");
    carousel.id = "carousel-container";
    const list = document.createElement("div");
    list.id = "country-list";
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "country-toggle";
    const layoutBtn = document.createElement("button");
    layoutBtn.id = "layout-toggle";
    const panel = document.createElement("div");
    panel.id = "country-panel";
    const clear = document.createElement("button");
    clear.id = "clear-filter";
    document.body.append(carousel, list, toggleBtn, layoutBtn, panel, clear);

    await setupBrowseJudokaPage();

    if (typeof globalThis.flushRAF === "function") {
      globalThis.flushRAF();
    }

    expect(buildCardCarousel).toHaveBeenCalledWith(
      [{ id: 0, firstname: "Fallback", surname: "Judoka" }],
      []
    );
    expect(carousel.querySelector(".judoka-card")).not.toBeNull();
    expect(carousel.querySelector(".error-message")).not.toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
