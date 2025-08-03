import { describe, it, expect } from "vitest";
import { generateJudokaCardHTML } from "../../src/helpers/cardBuilder.js";

const judoka = {
  id: 1,
  firstname: "John",
  surname: "Doe",
  country: "USA",
  countryCode: "us",
  stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
  weightClass: "-100kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "male",
  extra: 1n
};

const gokyoLookup = {
  1: { id: 1, name: "Uchi-mata" }
};

describe("generateJudokaCardHTML invalid inspector data", () => {
  it("renders fallback paragraph when card data cannot be stringified", async () => {
    const container = await generateJudokaCardHTML(judoka, gokyoLookup, {
      enableInspector: true
    });
    const panel = container.querySelector(".debug-panel");
    expect(panel).toBeNull();
    const fallback = container.querySelector("p");
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toBe("Invalid card data");
  });
});
