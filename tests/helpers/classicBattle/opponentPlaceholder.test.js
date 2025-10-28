import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  applyOpponentCardPlaceholder,
  OPPONENT_PLACEHOLDER_ID
} from "../../../src/helpers/classicBattle/opponentPlaceholder.js";

describe("applyOpponentCardPlaceholder", () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(
      `<div id="opponent-card" class="opponent-hidden"><div id="debug-panel"></div></div>`,
      {
        pretendToBeVisual: true
      }
    );
    document = dom.window.document;
  });

  afterEach(() => {
    dom?.window?.close();
  });

  it("removes the opponent-hidden class once the placeholder is applied", () => {
    const container = document.getElementById("opponent-card");
    expect(container).not.toBeNull();

    const placeholder = applyOpponentCardPlaceholder(container, { documentRef: document });

    expect(placeholder).not.toBeNull();
    expect(container.classList.contains("opponent-hidden")).toBe(false);
    expect(container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`)).toBe(placeholder);
  });
});
