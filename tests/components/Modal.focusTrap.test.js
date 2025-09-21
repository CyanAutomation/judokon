import { describe, it, beforeEach, expect } from "vitest";
import { Modal } from "../../src/components/Modal.js";

describe("Modal focus management", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps focus on dialog when no focusable children are present", () => {
    const trigger = document.createElement("button");
    trigger.id = "open-modal";
    document.body.appendChild(trigger);

    const content = document.createElement("p");
    content.textContent = "Informational message";

    const modal = new Modal(content);
    document.body.appendChild(modal.element);

    modal.open(trigger);

    expect(document.activeElement).toBe(modal.dialog);

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    modal.dialog.dispatchEvent(tabEvent);

    expect(document.activeElement).toBe(modal.dialog);

    modal.destroy();
  });

  it("wraps focus between the first and last focusable controls", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);

    const fragment = document.createDocumentFragment();
    const first = document.createElement("button");
    first.textContent = "First";
    const second = document.createElement("button");
    second.textContent = "Second";
    fragment.append(first, second);

    const modal = new Modal(fragment);
    document.body.appendChild(modal.element);

    modal.open(trigger);

    expect(document.activeElement).toBe(first);

    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    first.dispatchEvent(shiftTab);
    expect(document.activeElement).toBe(second);

    const tabForward = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    second.dispatchEvent(tabForward);
    expect(document.activeElement).toBe(first);

    modal.destroy();
  });
});
