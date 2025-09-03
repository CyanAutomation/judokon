import { describe, it, expect } from "vitest";
import { createModal } from "../../src/components/Modal.js";

function buildModal(id) {
  const frag = document.createDocumentFragment();
  const btn = document.createElement("button");
  btn.id = id;
  frag.append(btn);
  const modal = createModal(frag);
  document.body.appendChild(modal.element);
  return { modal, trigger: btn };
}

describe("modal manager stack", () => {
  it("closes only the top modal on Escape", () => {
    const first = buildModal("first-btn");
    const second = buildModal("second-btn");

    const trigger1 = document.createElement("button");
    const trigger2 = document.createElement("button");
    document.body.append(trigger1, trigger2);

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
  });
});
