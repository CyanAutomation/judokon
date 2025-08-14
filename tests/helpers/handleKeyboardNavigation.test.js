import { describe, it, expect, vi } from "vitest";
import { handleKeyboardNavigation } from "../../src/helpers/browse/handleKeyboardNavigation.js";

describe("handleKeyboardNavigation", () => {
  it("moves focus on arrow keys", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    first.className = "flag-button";
    first.tabIndex = 0;
    const second = document.createElement("button");
    second.className = "flag-button";
    second.tabIndex = 0;
    container.append(first, second);
    document.body.append(container);

    first.focus();
    const event = { key: "ArrowRight", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "flag-button");
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(second);
  });

  it("ignores non-arrow keys", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    first.className = "flag-button";
    first.tabIndex = 0;
    const second = document.createElement("button");
    second.className = "flag-button";
    second.tabIndex = 0;
    container.append(first, second);
    document.body.append(container);

    first.focus();
    const event = { key: "Enter", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "flag-button");
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });
});
