import { describe, it, expect, vi } from "vitest";
import { handleKeyboardNavigation } from "../../src/helpers/browse/handleKeyboardNavigation.js";
import { createButton } from "./components/Button.js";

describe("handleKeyboardNavigation", () => {
  it("moves focus on arrow keys", () => {
    const container = document.createElement("div");
    const first = createButton("First", { className: "flag-button" });
    first.element.tabIndex = 0;
    const second = createButton("Second", { className: "flag-button" });
    second.element.tabIndex = 0;
    container.append(first.element, second.element);
    document.body.append(container);

    first.element.focus();
    const event = { key: "ArrowRight", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "flag-button");
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(second.element);
  });

  it("ignores non-arrow keys", () => {
    const container = document.createElement("div");
    const first = createButton("First", { className: "flag-button" });
    first.element.tabIndex = 0;
    const second = createButton("Second", { className: "flag-button" });
    second.element.tabIndex = 0;
    container.append(first.element, second.element);
    document.body.append(container);

    first.element.focus();
    const event = { key: "Enter", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "flag-button");
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first.element);
  });
});
