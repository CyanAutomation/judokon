import { describe, it, expect } from "vitest";
import { createButton } from "../../src/components/Button.js";

describe("createButton", () => {
  it("creates a styled button with given options", () => {
    const btn = createButton("Click", {
      id: "btn",
      className: "custom",
      type: "submit"
    });
    expect(btn).toBeInstanceOf(HTMLButtonElement);
    expect(btn.id).toBe("btn");
    expect(btn.className).toBe("custom");
    expect(btn.type).toBe("submit");
    expect(btn.textContent).toBe("Click");
    expect(btn.style.backgroundColor).toBe("var(--button-bg)");
    expect(btn.style.color).toBe("var(--button-text-color)");
  });

  it("defaults type to button", () => {
    const btn = createButton("Label");
    expect(btn.type).toBe("button");
  });
});
