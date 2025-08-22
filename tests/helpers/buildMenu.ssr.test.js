import { describe, it, expect } from "vitest";
import { buildMenu } from "../../src/helpers/navigation/navigationUI.js";

const modes = [
  {
    id: "test",
    name: "Test",
    url: "test.html",
    order: 0,
    image: "test.png"
  }
];

describe("buildMenu SSR fallback", () => {
  it("builds menu using default orientation when window is undefined", () => {
    const originalWindow = globalThis.window;
    document.body.innerHTML = '<nav class="bottom-navbar"><div class="logo"></div></nav>';
    try {
      globalThis.window = undefined;
      const menu = buildMenu(modes, { orientation: "landscape" });
      expect(menu).toBeTruthy();
      const link = document.querySelector(".bottom-navbar a");
      expect(link).toBeTruthy();
    } finally {
      globalThis.window = originalWindow;
      document.body.innerHTML = "";
    }
  });

  it("returns null for portrait orientation when window is undefined", () => {
    const originalWindow = globalThis.window;
    document.body.innerHTML = '<nav class="bottom-navbar"><div class="logo"></div></nav>';
    try {
      globalThis.window = undefined;
      const menu = buildMenu(modes, { orientation: "portrait" });
      expect(menu).toBeNull();
      const link = document.querySelector(".bottom-navbar a");
      expect(link).toBeNull();
    } finally {
      globalThis.window = originalWindow;
      document.body.innerHTML = "";
    }
  });
});
