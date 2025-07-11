import { describe, it, expect } from "vitest";
import { createModal } from "../../src/components/Modal.js";

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
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement.id).toBe("cancel-btn");

    close();
    expect(element.hasAttribute("hidden")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
