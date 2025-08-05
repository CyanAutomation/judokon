import { describe, it, expect } from "vitest";
import { JudokaCard } from "../../src/components/JudokaCard.js";

vi.mock("../../src/helpers/stats.js", () => ({
  loadStatNames: () =>
    Promise.resolve([
      { name: "Power" },
      { name: "Speed" },
      { name: "Technique" },
      { name: "Kumi-kata" },
      { name: "Ne-waza" }
    ])
}));

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
  gender: "male"
};

const gokyoLookup = { 1: { id: 1, name: "Uchi-mata" } };

describe("judoka card flip interactivity", () => {
  it("toggles show-card-back on click", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    card.click();
    expect(card.classList.contains("show-card-back")).toBe(true);
    card.click();
    expect(card.classList.contains("show-card-back")).toBe(false);
  });

  it("toggles show-card-back on Enter key", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    card.dispatchEvent(event);
    expect(card.classList.contains("show-card-back")).toBe(true);
  });
});
