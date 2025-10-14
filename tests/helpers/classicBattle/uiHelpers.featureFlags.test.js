import { describe, it, expect, beforeEach } from "vitest";
import { setSkipRoundCooldownFeatureMarker } from "../../../src/helpers/classicBattle/uiHelpers.js";

describe("setSkipRoundCooldownFeatureMarker", () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="next-button"></button>';
    document.body.removeAttribute("data-feature-skip-round-cooldown");
  });

  it("marks the DOM when skip-round cooldown is enabled", () => {
    const nextButton = document.getElementById("next-button");
    setSkipRoundCooldownFeatureMarker(true);
    expect(document.body.getAttribute("data-feature-skip-round-cooldown")).toBe("enabled");
    expect(nextButton?.getAttribute("data-feature-skip-round-cooldown")).toBe("enabled");
  });

  it("marks the DOM when skip-round cooldown is disabled", () => {
    const nextButton = document.getElementById("next-button");
    setSkipRoundCooldownFeatureMarker(false);
    expect(document.body.getAttribute("data-feature-skip-round-cooldown")).toBe("disabled");
    expect(nextButton?.getAttribute("data-feature-skip-round-cooldown")).toBe("disabled");
  });
});
