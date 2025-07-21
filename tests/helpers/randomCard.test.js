import { describe, it, expect, vi } from "vitest";

let getRandomJudokaMock;
let generateJudokaCardHTMLMock;
let getFallbackJudokaMock;

vi.mock("../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args),
  renderJudokaCard: async (judoka, lookup, container) => {
    const el = await generateJudokaCardHTMLMock(judoka, lookup);
    if (el && container) container.appendChild(el);
    return el;
  }
}));

vi.mock("../../src/helpers/cardBuilder.js", () => ({
  generateJudokaCardHTML: (...args) => generateJudokaCardHTMLMock(...args)
}));

vi.mock("../../src/helpers/judokaUtils.js", () => ({
  getFallbackJudoka: (...args) => getFallbackJudokaMock(...args)
}));

vi.mock("../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn()
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

describe("generateRandomCard", () => {
  it("selects a random judoka and updates the DOM", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    generatedEl.textContent = "card";

    getRandomJudokaMock = vi.fn(() => judokaData[1]);
    generateJudokaCardHTMLMock = vi.fn(async () => generatedEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");

    await generateRandomCard(judokaData, gokyoData, container, true);

    expect(getRandomJudokaMock).toHaveBeenCalledWith(expect.any(Array));
    expect(generateJudokaCardHTMLMock).toHaveBeenCalled();
    expect(container.firstChild).toBe(generatedEl);
  });

  it("invokes onSelect callback with chosen judoka", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    generateJudokaCardHTMLMock = vi.fn(async () => generatedEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const cb = vi.fn();
    await generateRandomCard(judokaData, gokyoData, container, true, cb);
    expect(cb).toHaveBeenCalledWith(judokaData[0]);
  });

  it("falls back to id 0 when selection fails", async () => {
    const container = document.createElement("div");
    const fallbackEl = document.createElement("div");

    getRandomJudokaMock = vi.fn(() => {
      throw new Error("fail");
    });
    generateJudokaCardHTMLMock = vi.fn(async () => fallbackEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");

    await generateRandomCard([], gokyoData, container, true);

    expect(generateJudokaCardHTMLMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 0 }),
      expect.anything()
    );
    expect(container.firstChild).toBe(fallbackEl);
  });

  it("does not refetch gokyo data when falling back", async () => {
    const container = document.createElement("div");
    const fallbackEl = document.createElement("div");

    getRandomJudokaMock = vi.fn(() => {
      throw new Error("fail");
    });
    generateJudokaCardHTMLMock = vi.fn(async () => fallbackEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    fetchJson.mockResolvedValue(gokyoData);

    await generateRandomCard(judokaData, undefined, container, true);

    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining("gokyo.json"));
    expect(container.firstChild).toBe(fallbackEl);
  });

  it("does not throw if container is null or undefined", async () => {
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    generateJudokaCardHTMLMock = vi.fn(async () => document.createElement("div"));
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    await expect(generateRandomCard(judokaData, gokyoData, null, true)).resolves.toBeUndefined();
    await expect(
      generateRandomCard(judokaData, gokyoData, undefined, true)
    ).resolves.toBeUndefined();
  });

  it("handles generateJudokaCardHTML throwing an error", async () => {
    const container = document.createElement("div");
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    generateJudokaCardHTMLMock = vi.fn(async () => {
      throw new Error("fail");
    });
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    await expect(
      generateRandomCard(judokaData, gokyoData, container, true)
    ).resolves.toBeUndefined();
    expect(container.childNodes.length).toBe(0);
  });

  it("does not update DOM if generated element is null or undefined", async () => {
    const container = document.createElement("div");
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    generateJudokaCardHTMLMock = vi.fn(async () => null);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    await generateRandomCard(judokaData, gokyoData, container, true);
    expect(container.childNodes.length).toBe(0);
  });
});
