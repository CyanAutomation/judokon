import { describe, it, expect } from "vitest";
import { PlayerInfo } from "../../src/components/PlayerInfo.js";

describe("PlayerInfo", () => {
  it("initializes with provided text or default", () => {
    const defaultEl = new PlayerInfo();
    expect(defaultEl.textContent).toBe("Player");

    const customEl = new PlayerInfo("Opponent");
    expect(customEl.textContent).toBe("Opponent");
  });

  it("updates text when name attribute changes", () => {
    const el = new PlayerInfo();
    document.body.appendChild(el);
    expect(el.textContent).toBe("Player");
    el.setAttribute("name", "Jane");
    expect(el.textContent).toBe("Jane");
    el.removeAttribute("name");
    expect(el.textContent).toBe("Player");
  });
});
