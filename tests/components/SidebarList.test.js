import { describe, it, expect, vi } from "vitest";
import { createSidebarList } from "../../src/components/SidebarList.js";

describe("createSidebarList", () => {
  it("creates list items with zebra classes", () => {
    const { element } = createSidebarList(["One", "Two", "Three"]);
    const items = element.querySelectorAll("li");
    expect(element.classList.contains("sidebar-list")).toBe(true);
    expect(items).toHaveLength(3);
    expect(items[0].classList.contains("odd")).toBe(true);
    expect(items[1].classList.contains("even")).toBe(true);
  });

  it("select helper highlights items and calls callback", () => {
    const cb = vi.fn();
    const { element, select } = createSidebarList(["A", "B"], cb);
    const items = element.querySelectorAll("li");
    select(1);
    expect(items[1].classList.contains("selected")).toBe(true);
    expect(cb).toHaveBeenCalledWith(1, items[1]);
    select(-1);
    expect(items[1].classList.contains("selected")).toBe(true);
    select(0);
    expect(items[0].classList.contains("selected")).toBe(true);
  });
});
