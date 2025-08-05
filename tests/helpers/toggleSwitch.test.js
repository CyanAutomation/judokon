import { describe, it, expect } from "vitest";
import { ToggleSwitch } from "../../src/components/ToggleSwitch.js";

describe("ToggleSwitch", () => {
  it("creates the correct DOM structure", () => {
    const toggle = new ToggleSwitch("Sound", {
      id: "sound-toggle",
      name: "sound",
      checked: true,
      ariaLabel: "Sound toggle",
      tooltipId: "settings.sound"
    });
    const { element, input } = toggle;
    const label = element.querySelector("label.switch");
    const slider = element.querySelector(".slider");
    const span = element.querySelector("span");

    expect(element.className).toBe("settings-item");
    expect(label).toBeInstanceOf(HTMLLabelElement);
    expect(label?.htmlFor).toBe("sound-toggle");
    expect(input?.id).toBe("sound-toggle");
    expect(input?.name).toBe("sound");
    expect(input?.checked).toBe(true);
    expect(input).toHaveAttribute("aria-label", "Sound toggle");
    expect(slider?.classList.contains("round")).toBe(true);
    expect(span?.textContent).toBe("Sound");
    expect(input?.dataset.tooltipId).toBe("settings.sound");
  });

  it("defaults to unchecked when not specified", () => {
    const toggle = new ToggleSwitch("Option");
    expect(toggle.isChecked()).toBe(false);
  });

  it("uses label text as aria-label by default", () => {
    const toggle = new ToggleSwitch("AutoToggle");
    expect(toggle.input).toHaveAttribute("aria-label", "AutoToggle");
  });

  it("omits tooltip attribute when none provided", () => {
    const toggle = new ToggleSwitch("NoTip");
    expect(toggle.input.dataset.tooltipId).toBeUndefined();
  });

  it("allows programmatic state changes", () => {
    const toggle = new ToggleSwitch("Changeable");
    toggle.setChecked(true);
    expect(toggle.isChecked()).toBe(true);
  });
});
