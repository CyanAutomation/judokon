import { describe, it, expect, vi } from "vitest";
import { handleKeyboardNavigation } from "../../src/helpers/browse/handleKeyboardNavigation.js";

function createRadio() {
  const input = document.createElement("input");
  input.type = "radio";
  input.className = "flag-radio";
  input.tabIndex = 0;
  return input;
}

describe("handleKeyboardNavigation", () => {
  it("moves focus on arrow keys", () => {
    const container = document.createElement("div");
    const first = createRadio();
    const second = createRadio();
    container.append(first, second);
    document.body.append(container);

    first.focus();
    const event = { key: "ArrowRight", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "input.flag-radio");
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(second);
  });

  it("ignores non-arrow keys", () => {
    const container = document.createElement("div");
    const first = createRadio();
    const second = createRadio();
    container.append(first, second);
    document.body.append(container);

    first.focus();
    const event = { key: "Enter", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "input.flag-radio");
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });
});
