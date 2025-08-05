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
  id: 0,
  firstname: "Placeholder",
  surname: "Judoka",
  country: "Nowhere",
  countryCode: "xx",
  stats: { power: 0, speed: 0, technique: 0, kumikata: 0, newaza: 0 },
  weightClass: "-60kg",
  signatureMoveId: 0,
  rarity: "common",
  gender: "male"
};

const gokyoLookup = {
  0: { id: 0, name: "Jigoku-guruma" }
};

describe("judoka id 0 validation", () => {
  it("generates a card when stats are zero", async () => {
    const card = await new JudokaCard(judoka, gokyoLookup).render();
    expect(card).toBeInstanceOf(HTMLElement);
    const statsEl = card.querySelector(".card-stats");
    expect(statsEl.textContent).toContain("0");
  });
});
