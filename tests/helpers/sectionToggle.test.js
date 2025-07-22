import { describe, it, expect } from "vitest";

import { setupSectionToggles } from "../../src/helpers/settings/sectionToggle.js";

describe("setupSectionToggles", () => {
  it("toggles aria-expanded and hidden on button interaction", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <button class="settings-section-toggle" aria-expanded="false" aria-controls="sec" id="toggle">Toggle</button>
      <div class="settings-section-content" id="sec" hidden></div>
    `;
    document.body.appendChild(wrapper);

    setupSectionToggles();
    const button = document.getElementById("toggle");
    const content = document.getElementById("sec");

    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(content.hasAttribute("hidden")).toBe(false);

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    button.dispatchEvent(event);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(content.hasAttribute("hidden")).toBe(true);
  });
});
