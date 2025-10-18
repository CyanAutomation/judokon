import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createDrawCardStateMachine,
  updateDrawButtonLabel
} from "../../src/helpers/drawCardStateMachine.js";

describe("drawCardStateMachine", () => {
  let drawButton;

  beforeEach(() => {
    drawButton = document.createElement("button");
    drawButton.id = "test-button";
    document.body.appendChild(drawButton);
  });

  afterEach(() => {
    document.body.removeChild(drawButton);
  });

  describe("createDrawCardStateMachine", () => {
    it("initializes in IDLE state", () => {
      const sm = createDrawCardStateMachine(drawButton);
      expect(sm.currentState).toBe("IDLE");
    });

    it("IDLE state sets button to enabled with Draw Card label", () => {
      createDrawCardStateMachine(drawButton);
      expect(drawButton.disabled).toBe(false);
      expect(drawButton.textContent).toBe("Draw Card!"); // updateDrawButtonLabel sets this
      expect(drawButton.getAttribute("aria-disabled")).toBeNull();
      expect(drawButton.getAttribute("aria-busy")).toBeNull();
      expect(drawButton.classList.contains("is-loading")).toBe(false);
    });

    it("transition to DRAWING then back to IDLE restores label", () => {
      const sm = createDrawCardStateMachine(drawButton);
      sm.transition("DRAWING");
      expect(drawButton.textContent).toBe("Drawing…");
      sm.transition("SUCCESS");
      sm.transition("IDLE");
      expect(drawButton.textContent).toBe("Draw Card!");
    });

    it("transitions IDLE → DRAWING and updates button state", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");

      expect(stateMachine.currentState).toBe("DRAWING");
      expect(drawButton.disabled).toBe(true);
      expect(drawButton.getAttribute("aria-disabled")).toBe("true");
      expect(drawButton.getAttribute("aria-busy")).toBe("true");
      expect(drawButton.classList.contains("is-loading")).toBe(true);
      expect(drawButton.textContent).toBe("Drawing…");
    });

    it("transitions DRAWING → SUCCESS and updates button state", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");
      stateMachine.transition("SUCCESS");

      expect(stateMachine.currentState).toBe("SUCCESS");
      expect(drawButton.disabled).toBe(true);
      expect(drawButton.getAttribute("aria-disabled")).toBe("true");
      expect(drawButton.getAttribute("aria-busy")).toBe("true");
    });

    it("transitions DRAWING → ERROR and updates button state", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");
      stateMachine.transition("ERROR");

      expect(stateMachine.currentState).toBe("ERROR");
      expect(drawButton.disabled).toBe(true);
      expect(drawButton.getAttribute("aria-disabled")).toBe("true");
      expect(drawButton.getAttribute("aria-busy")).toBeNull();
    });

    it("transitions SUCCESS → IDLE and re-enables button", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");
      stateMachine.transition("SUCCESS");
      stateMachine.transition("IDLE");

      expect(stateMachine.currentState).toBe("IDLE");
      expect(drawButton.disabled).toBe(false);
      expect(drawButton.getAttribute("aria-disabled")).toBeNull();
      expect(drawButton.getAttribute("aria-busy")).toBeNull();
      expect(drawButton.textContent).toBe("Draw Card!");
    });

    it("transitions ERROR → IDLE and re-enables button", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");
      stateMachine.transition("ERROR");
      stateMachine.transition("IDLE");

      expect(stateMachine.currentState).toBe("IDLE");
      expect(drawButton.disabled).toBe(false);
      expect(drawButton.getAttribute("aria-disabled")).toBeNull();
      expect(drawButton.getAttribute("aria-busy")).toBeNull();
    });

    it("throws on invalid transition IDLE → ERROR", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      expect(() => stateMachine.transition("ERROR")).toThrow(/Invalid transition: IDLE → ERROR/);
    });

    it("throws on invalid transition DRAWING → IDLE", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");
      expect(() => stateMachine.transition("IDLE")).toThrow(/Invalid transition: DRAWING → IDLE/);
    });

    it("throws on invalid transition SUCCESS → DRAWING", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      stateMachine.transition("DRAWING");
      stateMachine.transition("SUCCESS");
      expect(() => stateMachine.transition("DRAWING")).toThrow(
        /Invalid transition: SUCCESS → DRAWING/
      );
    });

    it("throws on unknown state", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);
      expect(() => stateMachine.transition("UNKNOWN")).toThrow(/Unknown state: UNKNOWN/);
    });

    it("supports full happy path: IDLE → DRAWING → SUCCESS → IDLE", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);

      expect(stateMachine.currentState).toBe("IDLE");
      expect(drawButton.disabled).toBe(false);

      stateMachine.transition("DRAWING");
      expect(stateMachine.currentState).toBe("DRAWING");
      expect(drawButton.disabled).toBe(true);

      stateMachine.transition("SUCCESS");
      expect(stateMachine.currentState).toBe("SUCCESS");

      stateMachine.transition("IDLE");
      expect(stateMachine.currentState).toBe("IDLE");
      expect(drawButton.disabled).toBe(false);
    });

    it("supports error path: IDLE → DRAWING → ERROR → IDLE", () => {
      const stateMachine = createDrawCardStateMachine(drawButton);

      expect(stateMachine.currentState).toBe("IDLE");
      stateMachine.transition("DRAWING");
      expect(stateMachine.currentState).toBe("DRAWING");

      stateMachine.transition("ERROR");
      expect(stateMachine.currentState).toBe("ERROR");
      expect(drawButton.getAttribute("aria-busy")).toBeNull();

      stateMachine.transition("IDLE");
      expect(stateMachine.currentState).toBe("IDLE");
      expect(drawButton.disabled).toBe(false);
    });
  });

  describe("updateDrawButtonLabel", () => {
    it("updates button textContent directly when no .button-label exists", () => {
      const btn = document.createElement("button");
      btn.textContent = "Old Text";

      updateDrawButtonLabel(btn, "New Text");
      expect(btn.textContent).toBe("New Text");
    });

    it("updates .button-label child element when present", () => {
      const btn = document.createElement("button");
      const label = document.createElement("span");
      label.className = "button-label";
      label.textContent = "Old Label";
      btn.appendChild(label);

      updateDrawButtonLabel(btn, "New Label");
      expect(label.textContent).toBe("New Label");
    });

    it("handles null button gracefully", () => {
      expect(() => updateDrawButtonLabel(null, "Text")).not.toThrow();
    });

    it("handles undefined button gracefully", () => {
      expect(() => updateDrawButtonLabel(undefined, "Text")).not.toThrow();
    });
  });
});
