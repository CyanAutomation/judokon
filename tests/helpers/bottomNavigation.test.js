import { describe, it, expect, vi, afterEach } from "vitest";

function setupDom() {
  const navBar = document.createElement("div");
  navBar.className = "bottom-navbar";
  document.body.appendChild(navBar);
  return navBar;
}

afterEach(() => {
  if (global.localStorage) {
    global.localStorage.clear();
  }
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("populateNavbar", () => {
  it("applies order and visibility from navigation data", async () => {
    const navBar = setupDom();
    navBar.innerHTML = `
      <a data-testid="nav-1"></a>
      <a data-testid="nav-2"></a>
      <a data-testid="nav-3"></a>
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
});
