import { describe, it, expect, beforeEach } from "vitest";
import { showSettingsInfo } from "../../src/helpers/showSettingsInfo.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("showSettingsInfo", () => {
  it("creates and opens the modal", () => {
    const modal = showSettingsInfo("Flag", "desc");
    const title = document.getElementById("settings-info-title");
    const desc = document.getElementById("settings-info-desc");
    expect(title.textContent).toBe("Flag");
    expect(desc.textContent).toBe("desc");
    expect(document.body.contains(modal.element)).toBe(true);
    const ok = document.getElementById("settings-info-ok");
    ok.click();
    expect(document.body.contains(modal.element)).toBe(false);
  });
});
