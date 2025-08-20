import { describe, it, expect, vi } from "vitest";

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

    const { setupCountryToggle } = await import("../../src/helpers/browse/setupCountryToggle.js");

    const toggleBtn = document.createElement("button");
    const panel = document.createElement("div");
    const list = document.createElement("div");
    document.body.append(toggleBtn, panel, list);

    const countriesLoaded = setupCountryToggle(toggleBtn, panel, list);

    toggleBtn.click();
    await Promise.resolve();
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel);
    expect(createCountrySlider).toHaveBeenCalledTimes(1);
    expect(countriesLoaded()).toBe(true);

    toggleBtn.click();
    await Promise.resolve();
    expect(createCountrySlider).toHaveBeenCalledTimes(1);

    const first = list.querySelectorAll("button.flag-button")[0];
    const second = list.querySelectorAll("button.flag-button")[1];
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

    vi.doMock("../../src/helpers/countryPanel.js", () => ({
      toggleCountryPanel,
      toggleCountryPanelMode: vi.fn()
    }));

    const { setupCountryFilter } = await import("../../src/helpers/browse/setupCountryFilter.js");

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

    setupCountryFilter(list, clear, judoka, render, toggleBtn, panel, carousel, ariaLive);

    jpBtn.click();
    await Promise.resolve();
    expect(jpBtn.classList.contains("selected")).toBe(true);
    expect(render).toHaveBeenLastCalledWith([{ id: 1, country: "JP" }]);
    expect(ariaLive.textContent).toBe("Showing 1 judoka for JP");

    clear.click();
    await Promise.resolve();
    expect(allBtn.classList.contains("selected")).toBe(false);
    expect(jpBtn.classList.contains("selected")).toBe(false);
    expect(render).toHaveBeenLastCalledWith(judoka);
    expect(toggleCountryPanel).toHaveBeenCalledWith(toggleBtn, panel, false);
    expect(ariaLive.textContent).toBe("Showing 2 judoka for all countries");
  });

  it("shows a spinner during load and removes it after rendering", async () => {
    global.requestAnimationFrame = (cb) => cb();

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

    const createSpinner = (wrapper) => {
      const element = document.createElement("div");
      element.className = "loading-spinner";
      wrapper.appendChild(element);
      return {
        element,
        show: vi.fn(),
        hide: vi.fn(),
        remove: () => element.remove()
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

    const pagePromise = setupBrowseJudokaPage();
    await Promise.resolve();

    expect(carousel.querySelector(".loading-spinner")).not.toBeNull();

    fetchResolvers[0]([{ id: 1, country: "JP" }]);
    fetchResolvers[1]([]);
    await pagePromise;

    expect(carousel.querySelector(".loading-spinner")).toBeNull();
    expect(toggleCountryPanelMode).toHaveBeenCalledWith(panel, false);
  });

  it("renders a fallback card when judoka data fails to load", async () => {
    global.requestAnimationFrame = (cb) => cb();
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

    expect(buildCardCarousel).toHaveBeenCalledWith(
      [{ id: 0, firstname: "Fallback", surname: "Judoka" }],
      []
    );
    expect(carousel.querySelector(".judoka-card")).not.toBeNull();
    expect(carousel.querySelector(".error-message")).not.toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
