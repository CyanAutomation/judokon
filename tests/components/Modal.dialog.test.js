import { describe, it, beforeEach, expect, vi } from "vitest";
import { Modal } from "../../src/components/Modal.js";

describe("Modal dialog integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("opens the native dialog and restores focus on close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);

    const content = document.createElement("p");
    content.textContent = "Modal body";

    const modal = new Modal(content);
    document.body.appendChild(modal.element);

    const onClose = vi.fn();
    modal.element.addEventListener("close", onClose);

    modal.open(trigger);
    expect(modal.element.hasAttribute("open")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(modal.element);

    modal.close();
    expect(modal.element.hasAttribute("open")).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);

    modal.destroy();
  });

  it("responds to cancel events when native showModal is unavailable", () => {
    const modal = new Modal(document.createElement("div"));
    document.body.appendChild(modal.element);

    modal.open();
    expect(modal.element.hasAttribute("open")).toBe(true);

    modal.element.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    expect(modal.element.hasAttribute("open")).toBe(false);

    modal.destroy();
  });
});
