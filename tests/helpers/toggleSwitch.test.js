import { describe, it, expect } from "vitest";
import { createToggleSwitch } from "../../src/components/ToggleSwitch.js";

describe("createToggleSwitch", () => {
  it("creates the correct DOM structure", () => {
    const wrapper = createToggleSwitch("Sound", {
      id: "sound-toggle",
      name: "sound",
      checked: true,
      ariaLabel: "Sound toggle"
    });
    const label = wrapper.querySelector("label.switch");
    const input = wrapper.querySelector("input[type='checkbox']");
    const slider = wrapper.querySelector(".slider");
    const span = wrapper.querySelector("span");

    expect(wrapper.className).toBe("settings-item");
    expect(label).toBeInstanceOf(HTMLLabelElement);
    expect(label?.htmlFor).toBe("sound-toggle");
    expect(input?.id).toBe("sound-toggle");
    expect(input?.name).toBe("sound");
    expect(input?.checked).toBe(true);
    expect(input).toHaveAttribute("aria-label", "Sound toggle");
    expect(slider?.classList.contains("round")).toBe(true);
    expect(span?.textContent).toBe("Sound");
  });

  it("defaults to unchecked when not specified", () => {
    const wrapper = createToggleSwitch("Option");
    const input = wrapper.querySelector("input[type='checkbox']");
    expect(input?.checked).toBe(false);
  });

  it("uses label text as aria-label by default", () => {
    const wrapper = createToggleSwitch("AutoToggle");
    const input = wrapper.querySelector("input[type='checkbox']");
    expect(input).toHaveAttribute("aria-label", "AutoToggle");
  });
});
