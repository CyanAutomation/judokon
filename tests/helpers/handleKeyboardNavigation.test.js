import { describe, it, expect, vi } from "vitest";
import { handleKeyboardNavigation } from "../../src/helpers/browse/handleKeyboardNavigation.js";
describe("handleKeyboardNavigation", () => {
  it("moves focus on arrow keys", () => {
    const container = document.createElement("div");
    const first = document.createElement("input");
    first.type = "radio";
    first.name = "country-filter";
    const second = document.createElement("input");
    second.type = "radio";
    second.name = "country-filter";
    container.append(first, second);
    document.body.append(container);

    first.focus();
    const event = { key: "ArrowRight", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, 'input[type="radio"][name="country-filter"]');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(second);
  });

  it("ignores non-arrow keys", () => {
    const container = document.createElement("div");
    const first = document.createElement("input");
    first.type = "radio";
    first.name = "country-filter";
    const second = document.createElement("input");
    second.type = "radio";
    second.name = "country-filter";
    container.append(first, second);
    document.body.append(container);

    first.focus();
    const event = { key: "Enter", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, 'input[type="radio"][name="country-filter"]');
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });
});
