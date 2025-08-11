import { describe, it, expect } from "vitest";
import { createModal, Modal } from "../../src/components/Modal.js";

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
    const trigger = document.createElement("button");
    trigger.id = "trigger";
    document.body.appendChild(trigger);

    const { element, open, close } = createModal(buildContent());
    document.body.appendChild(element);

    open(trigger);
    expect(element.hasAttribute("hidden")).toBe(false);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement.id).toBe("cancel-btn");

    close();
    expect(element.hasAttribute("hidden")).toBe(true);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("applies aria labels from options", () => {
    const heading = document.createElement("h2");
    heading.id = "modal-title";
    const { element } = createModal(buildContent(), {
      labelledBy: heading,
      describedBy: "modal-desc"
    });
    document.body.appendChild(element);
    const dialog = element.querySelector(".modal");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
    expect(dialog).toHaveAttribute("aria-describedby", "modal-desc");
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
  });
});
