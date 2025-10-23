import { describe, it, expect, vi } from "vitest";
import { handleKeyboardNavigation } from "../../src/helpers/browse/handleKeyboardNavigation.js";

describe("handleKeyboardNavigation", () => {
  it("moves focus on arrow keys", () => {
    const changeSpy = vi.fn();
    const container = document.createElement("div");
    const first = document.createElement("input");
    first.type = "radio";
    first.name = "country-filter";
    first.id = "radio-first";
    first.checked = true;
    const firstLabel = document.createElement("label");
    firstLabel.className = "flag-button";
    firstLabel.htmlFor = first.id;
    firstLabel.textContent = "First";

    const second = document.createElement("input");
    second.type = "radio";
    second.name = "country-filter";
    second.id = "radio-second";
    const secondLabel = document.createElement("label");
    secondLabel.className = "flag-button";
    secondLabel.htmlFor = second.id;
    secondLabel.textContent = "Second";

    container.append(first, firstLabel, second, secondLabel);
    document.body.append(container);

    container.addEventListener("change", changeSpy);

    first.focus();
    const event = { key: "ArrowRight", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "flag-button");
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(second);
    expect(second.checked).toBe(true);
    expect(changeSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores non-arrow keys", () => {
    const container = document.createElement("div");
    const first = document.createElement("input");
    first.type = "radio";
    first.name = "country-filter";
    first.id = "radio-first";
    first.checked = true;
    const firstLabel = document.createElement("label");
    firstLabel.className = "flag-button";
    firstLabel.htmlFor = first.id;
    firstLabel.textContent = "First";

    const second = document.createElement("input");
    second.type = "radio";
    second.name = "country-filter";
    second.id = "radio-second";
    const secondLabel = document.createElement("label");
    secondLabel.className = "flag-button";
    secondLabel.htmlFor = second.id;
    secondLabel.textContent = "Second";

    container.append(first, firstLabel, second, secondLabel);
    document.body.append(container);

    first.focus();
    const event = { key: "Enter", preventDefault: vi.fn() };
    handleKeyboardNavigation(event, container, "flag-button");
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });
});
