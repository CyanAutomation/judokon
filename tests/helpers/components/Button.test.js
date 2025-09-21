import { describe, it, expect } from "vitest";
import { createButton } from "./Button.js";

describe("createButton", () => {
  it("creates a button with basic text", () => {
    const button = createButton("Click me");

    expect(button.element.tagName).toBe("BUTTON");
    expect(button.element.type).toBe("button");
    expect(button.element.textContent).toBe("Click me");
    expect(button.element.style.backgroundColor).toBe("var(--button-bg)");
    expect(button.element.style.color).toBe("var(--button-text-color)");
  });

  it("applies custom options", () => {
    const button = createButton("Submit", {
      id: "submit-btn",
      className: "primary",
      type: "submit",
      dataTestId: "submit-button"
    });

    expect(button.element.id).toBe("submit-btn");
    expect(button.element.className).toBe("primary");
    expect(button.element.type).toBe("submit");
    expect(button.element.dataset.testid).toBe("submit-button");
  });

  it("handles icon with label span", () => {
    const svgIcon = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5z"/></svg>';
    const button = createButton("Send", { icon: svgIcon });

    expect(button.element.querySelector("svg")).toBeTruthy();
    expect(button.element.querySelector(".button-label").textContent).toBe("Send");
  });

  it("tracks click events with spy", () => {
    const button = createButton("Click me");

    expect(button.onClick).not.toHaveBeenCalled();

    button.element.click();
    expect(button.onClick).toHaveBeenCalledTimes(1);

    button.click(); // programmatic click
    expect(button.onClick).toHaveBeenCalledTimes(2);
  });

  it("provides programmatic click method", () => {
    const button = createButton("Test");

    expect(button.onClick).not.toHaveBeenCalled();

    button.click();
    expect(button.onClick).toHaveBeenCalledTimes(1);
  });

  it("allows text updates", () => {
    const button = createButton("Original");

    expect(button.element.textContent).toBe("Original");

    button.setText("Updated");
    expect(button.element.textContent).toBe("Updated");
  });

  it("allows text updates with icons", () => {
    const svgIcon = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5z"/></svg>';
    const button = createButton("Original", { icon: svgIcon });

    const labelSpan = button.element.querySelector(".button-label");
    expect(labelSpan.textContent).toBe("Original");

    button.setText("Updated");
    expect(labelSpan.textContent).toBe("Updated");
  });

  it("handles disabled state", () => {
    const button = createButton("Test");

    expect(button.element.disabled).toBe(false);

    button.setDisabled(true);
    expect(button.element.disabled).toBe(true);

    button.setDisabled(false);
    expect(button.element.disabled).toBe(false);
  });
});
