import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const originalFetch = global.fetch;
const originalNavigator = global.navigator;

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

afterEach(() => {
  global.fetch = originalFetch;
  global.navigator = originalNavigator;
  if (global.localStorage) {
    global.localStorage.clear();
  }
});

describe("toggleExpandedMapView", () => {
  let navBar;

  beforeEach(() => {
    navBar = setupDom();
    stubLogoQuery();
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
    expect(img).toHaveAttribute("alt", "Mode1");
  });
});

describe("togglePortraitTextMenu", () => {
  let navBar;
  beforeEach(() => {
    navBar = setupDom();
    stubLogoQuery();
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
  });
});

describe("populateNavbar", () => {
  it("loads game modes and populates the navbar", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    const data = [
      { id: 1, name: "A", url: "a.html", category: "mainMenu", order: 2, isHidden: false },
      { id: 2, name: "B", url: "b.html", category: "mainMenu", order: 1, isHidden: false }
    ];
    const loadSettings = vi.fn().mockResolvedValue({
      sound: true,
      motionEffects: true,
      displayMode: "light",
      gameModes: { 2: false },
      featureFlags: {
        battleDebugPanel: false,
        fullNavigationMap: true,
        enableTestMode: false,
        enableCardInspector: false
      }
    });
    const loadNavigationItems = vi.fn().mockResolvedValue(data);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems
    }));

    const { populateNavbar } = await import("../../src/helpers/navigationBar.js");

    await populateNavbar();

    const items = navBar.querySelectorAll("li");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe("A");
    expect(loadSettings).toHaveBeenCalled();
    expect(loadNavigationItems).toHaveBeenCalled();
  });

  it("falls back to default items when fetch fails", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    localStorage.removeItem("navigationItems");
    const loadNavigationItems = vi.fn().mockRejectedValue(new Error("fail"));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems
    }));

    const { populateNavbar } = await import("../../src/helpers/navigationBar.js");

    await populateNavbar();

    const items = navBar.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("Random Judoka");
    expect(items[1].textContent).toBe("Home");
    expect(items[2].textContent).toBe("Classic Battle");
  });

  it("uses cached game modes when offline", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    const data = [
      { id: 3, name: "X", url: "x.html", category: "mainMenu", order: 1, isHidden: false }
    ];
    localStorage.setItem("navigationItems", JSON.stringify(data));
    const loadSettings = vi.fn().mockResolvedValue({
      sound: true,
      motionEffects: true,
      displayMode: "light",
      gameModes: {},
      featureFlags: {
        battleDebugPanel: false,
        fullNavigationMap: true,
        enableTestMode: false,
        enableCardInspector: false
      }
    });
    const loadNavigationItems = vi.fn().mockResolvedValue(data);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems
    }));

    const { populateNavbar } = await import("../../src/helpers/navigationBar.js");

    await populateNavbar();

    const items = navBar.querySelectorAll("li");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe("X");
    expect(loadNavigationItems).toHaveBeenCalled();
  });

  it("marks current page link as active", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    const data = [
      {
        id: 1,
        name: "Home",
        url: "home.html",
        category: "mainMenu",
        order: 1,
        isHidden: false
      },
      {
        id: 2,
        name: "About",
        url: "about.html",
        category: "mainMenu",
        order: 2,
        isHidden: false
      }
    ];
    const loadSettings = vi.fn().mockResolvedValue({
      sound: true,
      motionEffects: true,
      displayMode: "light",
      gameModes: {},
      featureFlags: {
        battleDebugPanel: false,
        fullNavigationMap: true,
        enableTestMode: false,
        enableCardInspector: false
      }
    });
    const loadNavigationItems = vi.fn().mockResolvedValue(data);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems
    }));

    window.history.pushState({}, "", "/src/pages/home.html");

    const { populateNavbar } = await import("../../src/helpers/navigationBar.js");

    await populateNavbar();

    const activeLink = navBar.querySelector("a.active");
    expect(activeLink).toBeTruthy();
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink.textContent).toBe("Home");
  });
});
