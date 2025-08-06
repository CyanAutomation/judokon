import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const originalFetch = global.fetch;
const originalNavigator = global.navigator;
const originalMatchMedia = global.matchMedia;

function stubLogoQuery() {
  const originalQuery = document.querySelector.bind(document);
  const fakeLogo = {
    addEventListener: vi.fn(),
    classList: { toggle: vi.fn(), contains: vi.fn(() => false) },
    style: {}
  };
  vi.spyOn(document, "querySelector").mockImplementation((sel) => {
    if (sel === ".bottom-navbar .logo") {
      return fakeLogo;
    }
    return originalQuery(sel);
  });
  return fakeLogo;
}

function setupDom() {
  const navBar = document.createElement("div");
  navBar.className = "bottom-navbar";
  document.body.appendChild(navBar);
  return navBar;
}

function stubOrientation(orientation) {
  global.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === `(orientation: ${orientation})`,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

afterEach(() => {
  global.fetch = originalFetch;
  global.navigator = originalNavigator;
  global.matchMedia = originalMatchMedia;
  if (global.localStorage) {
    global.localStorage.clear();
  }
});

describe("toggleExpandedMapView", () => {
  let navBar;

  beforeEach(() => {
    navBar = setupDom();
    stubLogoQuery();
    stubOrientation("landscape");
  });

  it("creates map tiles for valid game modes", async () => {
    const modes = [
      { name: "Mode1", url: "mode1.html", image: "img1.png" },
      { name: "Mode2", url: "mode2.html", image: "img2.png" },
      { url: "broken.html", image: "img3.png" }
    ];

    const { toggleExpandedMapView, BASE_PATH } = await import(
      "../../src/helpers/navigation/navMenu.js"
    );

    toggleExpandedMapView(modes);

    const view = navBar.querySelector(".expanded-map-view");
    expect(view).toBeTruthy();
    const tiles = view.querySelectorAll(".map-tile");
    expect(tiles).toHaveLength(2);
    expect(tiles[0].querySelector("a")).toHaveAttribute("href", `${BASE_PATH}mode1.html`);
    expect(tiles[0].querySelector("a")).toHaveAttribute("aria-label", "Mode1");
    expect(tiles[0].querySelector("a")).toHaveAttribute("data-tooltip-id", "nav.mode1");
    expect(tiles[0].textContent).toContain("Mode1");
  });

  it("does not create tiles if no valid modes", async () => {
    const { toggleExpandedMapView } = await import("../../src/helpers/navigation/navMenu.js");
    toggleExpandedMapView([]);
    const view = navBar.querySelector(".expanded-map-view");
    expect(view).toBeTruthy();
    expect(view.querySelectorAll(".map-tile")).toHaveLength(0);
  });

  it("sets correct ARIA attributes and alt text for images", async () => {
    const modes = [{ name: "Mode1", url: "mode1.html", image: "img1.png" }];
    const { toggleExpandedMapView } = await import("../../src/helpers/navigation/navMenu.js");
    toggleExpandedMapView(modes);
    const tile = navBar.querySelector(".map-tile");
    const link = tile.querySelector("a");
    const img = tile.querySelector("img");
    expect(link).toHaveAttribute("aria-label", "Mode1");
    expect(link).toHaveAttribute("data-tooltip-id", "nav.mode1");
    expect(img).toHaveAttribute("alt", "Mode1");
  });

  it("does nothing in portrait orientation", async () => {
    stubOrientation("portrait");
    const modes = [{ name: "Mode1", url: "mode1.html", image: "img1.png" }];
    const { toggleExpandedMapView } = await import("../../src/helpers/navigation/navMenu.js");
    toggleExpandedMapView(modes);
    expect(navBar.querySelector(".expanded-map-view")).toBeNull();
  });
});

describe("togglePortraitTextMenu", () => {
  let navBar;
  beforeEach(() => {
    navBar = setupDom();
    stubLogoQuery();
    stubOrientation("portrait");
  });

  it("creates list items for valid game modes", async () => {
    const modes = [
      { name: "Mode1", url: "mode1.html", image: "img1.png" },
      { name: "Mode2", url: "mode2.html", image: "img2.png" },
      { name: null, url: "broken.html" }
    ];

    const { togglePortraitTextMenu, BASE_PATH } = await import(
      "../../src/helpers/navigation/navMenu.js"
    );

    togglePortraitTextMenu(modes);

    const menu = navBar.querySelector(".portrait-text-menu");
    expect(menu).toBeTruthy();
    const items = menu.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[1].querySelector("a")).toHaveAttribute("href", `${BASE_PATH}mode2.html`);
    expect(items[1].querySelector("a")).toHaveAttribute("aria-label", "Mode2");
    expect(items[1].querySelector("a")).toHaveAttribute("data-tooltip-id", "nav.mode2");
    expect(items[1].textContent).toContain("Mode2");
  });

  it("does not create items if no valid modes", async () => {
    const { togglePortraitTextMenu } = await import("../../src/helpers/navigation/navMenu.js");
    togglePortraitTextMenu([]);
    const menu = navBar.querySelector(".portrait-text-menu");
    expect(menu).toBeTruthy();
    expect(menu.querySelectorAll("li")).toHaveLength(0);
  });

  it("sets correct ARIA attributes for links", async () => {
    const modes = [{ name: "Mode1", url: "mode1.html", image: "img1.png" }];
    const { togglePortraitTextMenu } = await import("../../src/helpers/navigation/navMenu.js");
    togglePortraitTextMenu(modes);
    const link = navBar.querySelector(".portrait-text-menu li a");
    expect(link).toHaveAttribute("aria-label", "Mode1");
    expect(link).toHaveAttribute("data-tooltip-id", "nav.mode1");
  });

  it("does nothing in landscape orientation", async () => {
    stubOrientation("landscape");
    const modes = [{ name: "Mode1", url: "mode1.html", image: "img1.png" }];
    const { togglePortraitTextMenu } = await import("../../src/helpers/navigation/navMenu.js");
    togglePortraitTextMenu(modes);
    expect(navBar.querySelector(".portrait-text-menu")).toBeNull();
  });
});

describe("populateNavbar", () => {
  it("orders and hides links based on navigation data", async () => {
    const navBar = setupDom();
    navBar.innerHTML = `
      <a data-testid="nav-1"></a>
      <a data-testid="nav-2"></a>
      <a data-testid="nav-3"></a>
    `;
    const loadNavigationItems = vi.fn().mockResolvedValue([
      { id: 1, category: "mainMenu", order: 2, isHidden: false },
      { id: 2, category: "mainMenu", order: 1, isHidden: true },
      { id: 4, category: "mainMenu", order: 3, isHidden: false }
    ]);
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({ loadNavigationItems }));

    const { populateNavbar } = await import("../../src/helpers/navigationBar.js");

    await populateNavbar();

    const links = navBar.querySelectorAll("a");
    expect(links[0].style.order).toBe("2");
    expect(links[0].classList.contains("hidden")).toBe(false);
    expect(links[1].style.order).toBe("1");
    expect(links[1].classList.contains("hidden")).toBe(true);
    expect(links[2].classList.contains("hidden")).toBe(true);
    expect(loadNavigationItems).toHaveBeenCalled();
  });
});
