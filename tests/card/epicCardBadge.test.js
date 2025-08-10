import { describe, it, expect, vi } from "vitest";
import { EpicCard } from "../../src/components/EpicCard.js";

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
  rarity: "epic",
  gender: "male"
};

const gokyoLookup = {
  1: { id: 1, name: "Uchi-mata" }
};

describe("EpicCard", () => {
  it("appends an epic badge", async () => {
    const container = await new EpicCard(judoka, gokyoLookup).render();
    const badge = container.querySelector(".epic-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("EPIC");
  });
});
