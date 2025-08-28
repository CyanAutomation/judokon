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

const gokyoLookup = {
  1: { id: 1, name: "Uchi-mata" }
};

describe("judoka card accessibility attributes", () => {
  it("applies role and aria-label to judoka-card element", async () => {
    const containerEl = document.createElement("div");
    const cardEl = await new JudokaCard(judoka, gokyoLookup).render();
    containerEl.appendChild(cardEl);
    const card = containerEl.querySelector(".judoka-card");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("aria-label", `${judoka.firstname} ${judoka.surname} card`);
  });
});
