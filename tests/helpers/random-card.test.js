import { describe, it, expect, vi, afterEach } from "vitest";

let getRandomJudokaMock;
let generateJudokaCardHTMLMock;

vi.mock("../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));

vi.mock("../../src/helpers/cardBuilder.js", () => ({
  generateJudokaCardHTML: (...args) => generateJudokaCardHTMLMock(...args)
}));

vi.mock("../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchDataWithErrorHandling: vi.fn()
}));

const judokaData = [
  {
    id: 1,
    firstname: "A",
    surname: "B",
    country: "X",
    countryCode: "x",
    stats: { power: 1, speed: 1, technique: 1, kumikata: 1, newaza: 1 },
    weightClass: "-60",
    signatureMoveId: 1,
    rarity: "common"
  },
  {
    id: 2,
    firstname: "C",
    surname: "D",
    country: "Y",
    countryCode: "y",
    stats: { power: 2, speed: 2, technique: 2, kumikata: 2, newaza: 2 },
    weightClass: "+60",
    signatureMoveId: 2,
    rarity: "rare"
  }
];

const gokyoData = [
  { id: 0, name: "Jigoku-guruma" },
  { id: 1, name: "Throw1" },
  { id: 2, name: "Throw2" }
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("generateRandomCard", () => {
  it("selects a random judoka and updates the DOM", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    generatedEl.textContent = "card";

    getRandomJudokaMock = vi.fn(() => judokaData[1]);
    generateJudokaCardHTMLMock = vi.fn(async () => generatedEl);

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");

    await generateRandomCard(judokaData, gokyoData, container, true);

    expect(getRandomJudokaMock).toHaveBeenCalledWith(expect.any(Array));
    expect(generateJudokaCardHTMLMock).toHaveBeenCalled();
    expect(container.firstChild).toBe(generatedEl);
  });

  it("falls back to id 0 when selection fails", async () => {
    const container = document.createElement("div");
    const fallbackEl = document.createElement("div");

    getRandomJudokaMock = vi.fn(() => {
      throw new Error("fail");
    });
    generateJudokaCardHTMLMock = vi.fn(async () => fallbackEl);

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");

    await generateRandomCard([], gokyoData, container, true);

    expect(generateJudokaCardHTMLMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 0 }),
      expect.anything()
    );
    expect(container.firstChild).toBe(fallbackEl);
  });
});
