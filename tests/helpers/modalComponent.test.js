import { describe, it, expect } from "vitest";
import { createModal, Modal } from "../../src/components/Modal.js";
import { mount, clearBody } from "./domUtils.js";

function buildContent() {
  const frag = document.createDocumentFragment();
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.id = "cancel-btn";
  const save = document.createElement("button");
  save.textContent = "Save";
  frag.append(cancel, save);
  return frag;
}

describe("createModal", () => {
  it("opens and closes the modal with focus management", () => {
    const { root, container } = mount();
    const trigger = document.createElement("button");
    trigger.id = "trigger";
    container.appendChild(trigger);

    const modal = createModal(buildContent());
    container.appendChild(modal.element);

    modal.open(trigger);
    expect(modal.element.hasAttribute("hidden")).toBe(false);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement.id).toBe("cancel-btn");

    modal.close();
    expect(modal.element.hasAttribute("hidden")).toBe(true);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);

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
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const modal = new Modal(buildContent());
    document.body.appendChild(modal.element);
    modal.open(trigger);
    expect(modal.element.hasAttribute("hidden")).toBe(false);
    modal.close();
    expect(modal.element.hasAttribute("hidden")).toBe(true);
    modal.destroy();
  });

  it("removes element on destroy", () => {
    const modal = createModal(buildContent());
    document.body.appendChild(modal.element);
    modal.destroy();
    expect(document.body.contains(modal.element)).toBe(false);
  });
});
