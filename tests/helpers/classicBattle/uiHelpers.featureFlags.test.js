import { describe, it, expect, beforeEach } from "vitest";
import {
  setSkipRoundCooldownFeatureMarker,
  setBattleStateBadgeEnabled
} from "../../../src/helpers/classicBattle/uiHelpers.js";

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

describe("setBattleStateBadgeEnabled", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header>
        <div id="scoreboard-right"></div>
      </header>
    `;
    document.body.dataset.battleState = "Intro";
    document.body.removeAttribute("data-feature-battle-state-badge");
  });

  it("creates the badge when enabled and updates markers", () => {
    setBattleStateBadgeEnabled(true);
    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.getAttribute("data-feature-battle-state-badge")).toBe("enabled");
    expect(document.body.getAttribute("data-feature-battle-state-badge")).toBe("enabled");
  });

  it("removes the badge when disabled and updates markers", () => {
    document.body.innerHTML = `
      <header>
        <div id="scoreboard-right">
          <p id="battle-state-badge" data-feature-battle-state-badge="enabled"></p>
        </div>
      </header>
    `;
    setBattleStateBadgeEnabled(false);
    expect(document.getElementById("battle-state-badge")).toBeNull();
    expect(document.body.getAttribute("data-feature-battle-state-badge")).toBe("disabled");
  });
});
