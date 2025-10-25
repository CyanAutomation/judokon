import { describe, it, expect, vi } from "vitest";
import { SidebarList } from "../../src/components/SidebarList.js";

describe("SidebarList", () => {
  it("creates radio items with zebra classes", () => {
    const { element } = new SidebarList(["One", "Two", "Three"]);
    const options = element.querySelectorAll(".sidebar-list__option");
    const inputs = element.querySelectorAll('input[type="radio"]');
    const labels = element.querySelectorAll(".sidebar-list__label");
    expect(element.tagName).toBe("FIELDSET");
    expect(element.classList.contains("sidebar-list")).toBe(true);
    expect(inputs).toHaveLength(3);
    expect(labels).toHaveLength(3);
    expect(options[0].classList.contains("odd")).toBe(true);
    expect(options[1].classList.contains("even")).toBe(true);
  });

  it("select helper checks radios, pulses labels, and calls callback", () => {
    const cb = vi.fn();
    const list = new SidebarList(["A", "B"], cb);
    const { element } = list;
    const inputs = element.querySelectorAll('input[type="radio"]');
    const labels = element.querySelectorAll(".sidebar-list__label");

    list.select(1);
    expect(inputs[1].checked).toBe(true);
    expect(labels[1].getAttribute("aria-current")).toBe("page");
    expect(labels[1].classList.contains("sidebar-list__label--pulse")).toBe(true);
    expect(cb).toHaveBeenCalledWith(1, labels[1], { focus: true, silent: false });

    list.select(-1, { focus: false });
    expect(inputs[1].checked).toBe(true);
    expect(cb).toHaveBeenCalledWith(1, labels[1], { focus: false, silent: false });

    list.select(0);
    expect(inputs[0].checked).toBe(true);
    expect(labels[0].getAttribute("aria-current")).toBe("page");
  });

  it("relies on change events to trigger onSelect", () => {
    const cb = vi.fn();
    const list = new SidebarList(["A", "B", "C"], cb);
    document.body.appendChild(list.element);
    const inputs = list.element.querySelectorAll('input[type="radio"]');

    inputs[1].checked = true;
    inputs[1].dispatchEvent(new Event("change", { bubbles: true }));

    expect(cb).toHaveBeenCalledWith(1, list.labels[1], {
      event: expect.any(Event),
      focus: false,
      silent: false
    });
    expect(inputs[1].checked).toBe(true);
    list.element.remove();
  });
});
