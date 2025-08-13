import { describe, it, expect, vi, afterEach } from "vitest";
import { displayJudokaCard } from "../../src/helpers/cardUtils.js";
import * as validation from "../../src/helpers/judokaValidation.js";

const validJudoka = {
  firstname: "A",
  surname: "B",
  country: "C",
  countryCode: "cc",
  stats: { power: 1, speed: 1, technique: 1, kumikata: 1, newaza: 1 },
  weightClass: "-60",
  signatureMoveId: 1,
  rarity: 1
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("displayJudokaCard", () => {
  it("returns early with console error when gameArea is null", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(displayJudokaCard(validJudoka, {}, null)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("Game area is not available.");
  });

  it("handles null gameArea even when judoka is invalid", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(displayJudokaCard({}, {}, null)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("Game area is not available.");
  });

  it("escapes missing fields before inserting HTML", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(validation, "hasRequiredJudokaFields").mockReturnValue(false);
    vi.spyOn(validation, "getMissingJudokaFields").mockReturnValue([
      "<img src=x onerror=alert('xss')>"
    ]);
    const gameArea = document.createElement("div");
    await displayJudokaCard({}, {}, gameArea);
    expect(gameArea.innerHTML).toBe(
      "<p>⚠️ Invalid judoka data. Missing fields: &lt;img src=x onerror=alert('xss')&gt;</p>"
    );
    expect(gameArea.querySelector("img")).toBeNull();
  });
});
