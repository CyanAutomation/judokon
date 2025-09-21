import { describe, it, expect } from "vitest";
import { createModal, Modal } from "../../src/components/Modal.js";
import { mount, clearBody } from "./domUtils.js";
import { createButton } from "./components/Button.js";

function buildContent() {
  const frag = document.createDocumentFragment();
  const cancel = createButton("Cancel", { id: "cancel-btn" });
  const save = createButton("Save");
  frag.append(cancel.element, save.element);
  return frag;
}

describe("createModal", () => {
  it("opens and closes the modal with focus management", () => {
    const { container } = mount();
    const trigger = createButton("Open Modal", { id: "trigger" });
    container.appendChild(trigger.element);

    const modal = createModal(buildContent());
    container.appendChild(modal.element);

    modal.open(trigger.element);
    expect(modal.element.hasAttribute("hidden")).toBe(false);
    expect(trigger.element).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement.id).toBe("cancel-btn");

    modal.close();
    expect(modal.element.hasAttribute("hidden")).toBe(true);
    expect(trigger.element).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger.element);

    modal.destroy();
    clearBody();
  });

  it("applies aria labels from options", () => {
    const { container } = mount();
    const heading = document.createElement("h2");
    heading.id = "modal-title";
    const modal = createModal(buildContent(), {
      labelledBy: heading,
      describedBy: "modal-desc"
    });
    container.appendChild(modal.element);
    const dialog = modal.element.querySelector(".modal");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
    expect(dialog).toHaveAttribute("aria-describedby", "modal-desc");
    modal.destroy();
    clearBody();
  });
});

describe("Modal class", () => {
  it("allows direct instantiation", () => {
    const { container } = mount();
    const trigger = createButton("Open Modal");
    container.appendChild(trigger.element);
    const modal = new Modal(buildContent());
    container.appendChild(modal.element);
    modal.open(trigger.element);
    expect(modal.element.hasAttribute("hidden")).toBe(false);
    modal.close();
    expect(modal.element.hasAttribute("hidden")).toBe(true);
    modal.destroy();
    clearBody();
  });

  it("removes element on destroy", () => {
    const { container } = mount();
    const modal = createModal(buildContent());
    container.appendChild(modal.element);
    modal.destroy();
    expect(container.contains(modal.element)).toBe(false);
    clearBody();
  });
});
