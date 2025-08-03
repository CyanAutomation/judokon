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
    expect(items[1].getAttribute("aria-current")).toBe("page");
    expect(cb).toHaveBeenCalledWith(1, items[1]);
    select(-1);
    expect(items[1].classList.contains("selected")).toBe(true);
    expect(items[1].getAttribute("aria-current")).toBe("page");
    select(0);
    expect(items[0].classList.contains("selected")).toBe(true);
    expect(items[0].getAttribute("aria-current")).toBe("page");
  });

  it("handles arrow key navigation and focus", () => {
    const { element } = createSidebarList(["A", "B", "C"]);
    document.body.appendChild(element);
    const items = element.querySelectorAll("li");

    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(items[0].classList.contains("selected")).toBe(true);
    expect(items[0].getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(items[0]);

    items[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(items[1].classList.contains("selected")).toBe(true);
    expect(items[1].getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(items[1]);

    items[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(items[0].classList.contains("selected")).toBe(true);
    expect(items[0].getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(items[0]);
  });
});
