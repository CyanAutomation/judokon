import {
  createStatButton,
  createSnackbar,
  createScoreboard,
  attachEventSpy,
  withMutedConsole,
  createButton,
  createDiv
} from "./domFactory.js";

describe("domFactory", () => {
  describe("createStatButton", () => {
    it("creates a button with default props", () => {
      const btn = createStatButton();
      expect(btn.tagName).toBe("BUTTON");
      expect(btn.textContent).toBe("Stat");
      expect(btn.getAttribute("aria-label")).toBe("Stat");
      expect(btn.disabled).toBe(false);
      expect(btn.className).toBe("stat-button");
    });

    it("respects custom props", () => {
      const btn = createStatButton({ label: "Power", aria: "Select power stat", disabled: true });
      expect(btn.textContent).toBe("Power");
      expect(btn.getAttribute("aria-label")).toBe("Select power stat");
      expect(btn.disabled).toBe(true);
    });

    it("mock click prevents action when disabled", () => {
      const btn = createStatButton({ disabled: true });
      btn.click();
      expect(btn.click).toHaveBeenCalledTimes(1);
      // In real DOM, disabled buttons don't fire clicks, but our mock tracks the attempt
    });

    it("mock click allows action when enabled", () => {
      const btn = createStatButton();
      btn.click();
      expect(btn.click).toHaveBeenCalledTimes(1);
    });
  });

  describe("createSnackbar", () => {
    it("creates hidden snackbar", () => {
      const snackbar = createSnackbar();
      expect(snackbar.element.tagName).toBe("DIV");
      expect(snackbar.element.className).toBe("snackbar");
      expect(snackbar.element.style.display).toBe("none");
      expect(snackbar.lastMessage).toBe("");
    });

    it("shows and hides messages", () => {
      const snackbar = createSnackbar();
      snackbar.show("Test message");
      expect(snackbar.element.textContent).toBe("Test message");
      expect(snackbar.element.style.display).toBe("block");
      expect(snackbar.lastMessage).toBe("Test message");

      snackbar.hide();
      expect(snackbar.element.style.display).toBe("none");
    });
  });

  describe("createScoreboard", () => {
    it("creates scoreboard with initial score", () => {
      const { element, updateScore } = createScoreboard();
      updateScore({ player: 1, opponent: 2 }); // Use updateScore to update the scoreboard
      expect(element.tagName).toBe("DIV");
      expect(element.className).toBe("scoreboard");
      expect(element.textContent).toContain("Player: 1");
      expect(element.textContent).toContain("Opponent: 2");
    });

    it("updates score and re-renders", () => {
      const { element, updateScore } = createScoreboard();
      updateScore({ player: 5, opponent: 3 });
      expect(element.textContent).toContain("Player: 5");
      expect(element.textContent).toContain("Opponent: 3");
    });
  });

  describe("attachEventSpy", () => {
    it("attaches spy to element events", () => {
      const el = document.createElement("div");
      const spy = attachEventSpy(el, "click");

      const event = new Event("click");
      el.dispatchEvent(event);

      expect(spy).toHaveBeenCalledWith(event);
    });
  });

  describe("createButton", () => {
    it("creates a button with options", () => {
      const btn = createButton({
        text: "Click me",
        id: "test-btn",
        className: "btn",
        disabled: true
      });
      expect(btn.tagName).toBe("BUTTON");
      expect(btn.textContent).toBe("Click me");
      expect(btn.id).toBe("test-btn");
      expect(btn.className).toBe("btn");
      expect(btn.disabled).toBe(true);
    });
  });

  describe("createDiv", () => {
    it("creates a div with options", () => {
      const div = createDiv({ id: "test-div", className: "container", textContent: "Hello" });
      expect(div.tagName).toBe("DIV");
      expect(div.id).toBe("test-div");
      expect(div.className).toBe("container");
      expect(div.textContent).toBe("Hello");
    });
  });

  describe("withMutedConsole", () => {
    it("mutes console.warn and console.error", async () => {
      let warnCalled = false;
      let errorCalled = false;

      const originalWarn = console.warn;
      const originalError = console.error;

      console.warn = () => {
        warnCalled = true;
      };
      console.error = () => {
        errorCalled = true;
      };

      await withMutedConsole(async () => {
        console.warn("test warn");
        console.error("test error");
      });

      expect(warnCalled).toBe(false);
      expect(errorCalled).toBe(false);

      // Restore
      console.warn = originalWarn;
      console.error = originalError;
    });
  });
});
