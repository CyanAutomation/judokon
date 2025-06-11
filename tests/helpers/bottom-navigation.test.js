import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

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
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  vi.resetModules();
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

    const { toggleExpandedMapView } = await import("../../src/helpers/bottomNavigation.js");

    toggleExpandedMapView(modes);

    const view = navBar.querySelector(".expanded-map-view");
    expect(view).toBeTruthy();
    const tiles = view.querySelectorAll(".map-tile");
    expect(tiles).toHaveLength(2);
    expect(tiles[0].querySelector("a")).toHaveAttribute("href", "src/pages/mode1.html");
    expect(tiles[0].querySelector("a")).toHaveAttribute("aria-label", "Mode1");
    expect(tiles[0].textContent).toContain("Mode1");
  });
});

describe("togglePortraitTextMenu", () => {
  it("creates list items for valid game modes", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    const modes = [
      { name: "Mode1", url: "mode1.html", image: "img1.png" },
      { name: "Mode2", url: "mode2.html", image: "img2.png" },
      { name: null, url: "broken.html" }
    ];

    const { togglePortraitTextMenu } = await import("../../src/helpers/bottomNavigation.js");

    togglePortraitTextMenu(modes);

    const menu = navBar.querySelector(".portrait-text-menu");
    expect(menu).toBeTruthy();
    const items = menu.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[1].querySelector("a")).toHaveAttribute("href", "src/pages/mode2.html");
    expect(items[1].querySelector("a")).toHaveAttribute("aria-label", "Mode2");
    expect(items[1].textContent).toContain("Mode2");
  });
});

describe("populateNavbar", () => {
  it("loads game modes and populates the navbar", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    const data = [
      { name: "A", url: "a.html", category: "mainMenu", order: 2, isHidden: false },
      { name: "B", url: "b.html", category: "mainMenu", order: 1, isHidden: false }
    ];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => data });

    const { populateNavbar } = await import("../../src/helpers/bottomNavigation.js");

    await populateNavbar();

    const items = navBar.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe("B");
    expect(items[1].textContent).toBe("A");
  });

  it("falls back to default items when fetch fails", async () => {
    const navBar = setupDom();
    stubLogoQuery();
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    const { populateNavbar } = await import("../../src/helpers/bottomNavigation.js");

    await populateNavbar();

    const items = navBar.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("Random Judoka");
    expect(items[1].textContent).toBe("Home");
    expect(items[2].textContent).toBe("Classic Battle");
  });
});
