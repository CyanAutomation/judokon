import { describe, it, expect, vi, afterEach } from "vitest";

const originalLocation = window.location;

function setupDom() {
  const navBar = document.createElement("nav");
  navBar.className = "bottom-navbar";
  navBar.innerHTML = "<ul></ul>";
  document.body.appendChild(navBar);
  return navBar;
}

afterEach(() => {
  if (global.localStorage) {
    global.localStorage.clear();
  }
  document.body.innerHTML = "";
  vi.resetModules();
  Object.defineProperty(window, "location", {
    value: originalLocation,
    configurable: true
  });
});

describe("populateNavbar", () => {
  it("applies order and visibility from navigation data", async () => {
    const navBar = setupDom();
    const list = navBar.querySelector("ul");
    list.innerHTML = `
      <li><a data-testid="nav-1"></a></li>
      <li><a data-testid="nav-2"></a></li>
      <li><a data-testid="nav-3"></a></li>
    `;

    vi.mock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems: vi.fn().mockResolvedValue([
        { id: 1, category: "mainMenu", order: 2, isHidden: false },
        { id: 2, category: "mainMenu", order: 1, isHidden: true },
        { id: 4, category: "mainMenu", order: 3, isHidden: false }
      ])
    }));

    const { populateNavbar } = await import("../../src/helpers/navigationBar.js");

    await populateNavbar();

    const links = navBar.querySelectorAll("a");
    expect(links[0].style.order).toBe("2");
    expect(links[0].classList.contains("hidden")).toBe(false);
    expect(links[1].style.order).toBe("1");
    expect(links[1].classList.contains("hidden")).toBe(true);
    expect(links[2].classList.contains("hidden")).toBe(true);
  });

  it("highlights the active link based on pathname", async () => {
    const navBar = setupDom();
    const list = navBar.querySelector("ul");
    list.innerHTML = `
      <li><a href="/home?x=1"></a></li>
      <li><a href="/about"></a></li>
    `;

    Object.defineProperty(window, "location", {
      value: { href: "https://example.com/home", pathname: "/home" },
      configurable: true
    });

    const { highlightActiveLink } = await import("../../src/helpers/navigationBar.js");

    highlightActiveLink();

    const links = navBar.querySelectorAll("a");
    expect(links[0].classList.contains("active")).toBe(true);
    expect(links[1].classList.contains("active")).toBe(false);
  });
});
