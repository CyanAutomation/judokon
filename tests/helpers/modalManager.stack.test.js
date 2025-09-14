import { describe, it, expect } from "vitest";
import { createModal } from "../../src/components/Modal.js";
import { mount, clearBody } from "./domUtils.js";

function buildModal(id, container) {
  const frag = document.createDocumentFragment();
  const btn = document.createElement("button");
  btn.id = id;
  frag.append(btn);
  const modal = createModal(frag);
  container.appendChild(modal.element);
  return { modal, trigger: btn };
}

describe("modal manager stack", () => {
  it("closes only the top modal on Escape", () => {
    const { container } = mount();
    const first = buildModal("first-btn", container);
    const second = buildModal("second-btn", container);

    const trigger1 = document.createElement("button");
    const trigger2 = document.createElement("button");
    container.append(trigger1, trigger2);

    first.modal.open(trigger1);
    second.modal.open(trigger2);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(second.modal.element.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(trigger2);
    expect(first.modal.element.hasAttribute("hidden")).toBe(false);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(first.modal.element.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(trigger1);

    first.modal.destroy();
    second.modal.destroy();
    clearBody();
  });
});
