import { describe, it, expect } from "vitest";
import { createModal } from "./Modal.js";

describe("createModal", () => {
  it("creates a modal with basic structure", () => {
    const content = document.createElement("p");
    content.textContent = "Modal content";
    const modal = createModal(content);

    expect(modal.element.tagName).toBe("DIV");
    expect(modal.element.className).toBe("modal-backdrop");
    expect(modal.element.hasAttribute("hidden")).toBe(true);

    expect(modal.dialog.tagName).toBe("DIV");
    expect(modal.dialog.className).toBe("modal");
    expect(modal.dialog.getAttribute("role")).toBe("dialog");
    expect(modal.dialog.getAttribute("aria-modal")).toBe("true");
    expect(modal.dialog.tabIndex).toBe(-1);

    expect(modal.isOpen).toBe(false);
  });

  it("applies ARIA labels from options", () => {
    const content = document.createElement("div");
    const heading = document.createElement("h2");
    heading.id = "modal-title";
    const desc = document.createElement("p");
    desc.id = "modal-desc";

    const modal = createModal(content, {
      labelledBy: heading,
      describedBy: desc
    });

    expect(modal.dialog.getAttribute("aria-labelledby")).toBe("modal-title");
    expect(modal.dialog.getAttribute("aria-describedby")).toBe("modal-desc");
  });

  it("opens and closes with focus management", () => {
    const content = document.createElement("div");
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);

    const modal = createModal(content);
    document.body.appendChild(modal.element);

    // Open modal
    modal.open(trigger);
    expect(modal.element.hasAttribute("hidden")).toBe(false);
    expect(modal.isOpen).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(modal.onOpen).toHaveBeenCalledWith(trigger);

    // Close modal
    modal.close();
    expect(modal.element.hasAttribute("hidden")).toBe(true);
    expect(modal.isOpen).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(modal.onClose).toHaveBeenCalled();

    modal.destroy();
    document.body.removeChild(trigger);
  });

  it("closes on backdrop click", () => {
    const content = document.createElement("div");
    const modal = createModal(content);
    document.body.appendChild(modal.element);

    modal.open();
    expect(modal.isOpen).toBe(true);

    // Click on backdrop (not dialog)
    modal.element.click();
    expect(modal.isOpen).toBe(false);
    expect(modal.onClose).toHaveBeenCalled();

    modal.destroy();
  });

  it("destroys and cleans up", () => {
    const content = document.createElement("div");
    const modal = createModal(content);
    document.body.appendChild(modal.element);

    modal.open();
    expect(modal.isOpen).toBe(true);

    modal.destroy();
    expect(modal.isOpen).toBe(false);
    expect(modal.element.parentNode).toBeNull();
  });
});
