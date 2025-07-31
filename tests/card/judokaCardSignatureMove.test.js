import { generateJudokaCardHTML } from "../../src/helpers/cardBuilder.js";

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

describe("signature move placement", () => {
  it("adds the signature move as a direct child of the judoka card", async () => {
    const container = await generateJudokaCardHTML(judoka, gokyoLookup);
    const card = container.querySelector(".judoka-card");
    const direct = card.querySelector(":scope > .signature-move-container");
    expect(direct).toBeInstanceOf(HTMLElement);
    expect(direct.dataset.tooltipId).toBe("ui.signatureBar");
  });
});
