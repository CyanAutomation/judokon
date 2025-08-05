import { describe, it, expect, vi } from "vitest";
import { getJudokaFixture, getGokyoFixture } from "../utils/testUtils.js";

let getRandomJudokaMock;
let renderMock;
let JudokaCardMock;
let getFallbackJudokaMock;

vi.mock("../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));

vi.mock("../../src/components/JudokaCard.js", () => {
  renderMock = vi.fn();
  JudokaCardMock = vi.fn().mockImplementation(() => ({ render: renderMock }));
  return { JudokaCard: JudokaCardMock };
});

vi.mock("../../src/helpers/judokaUtils.js", () => ({
  getFallbackJudoka: (...args) => getFallbackJudokaMock(...args)
}));

vi.mock("../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn()
}));

describe("generateRandomCard", () => {
  it("selects a random judoka and updates the DOM", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    generatedEl.textContent = "card";
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();

    getRandomJudokaMock = vi.fn(() => judokaData[1]);
    renderMock = vi.fn(async () => generatedEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");

    await generateRandomCard(judokaData, gokyoData, container, true);

    expect(getRandomJudokaMock).toHaveBeenCalledWith(expect.any(Array));
    expect(JudokaCardMock).toHaveBeenCalled();
    expect(container.firstChild).toBe(generatedEl);
  });

  it("invokes onSelect callback with chosen judoka", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    renderMock = vi.fn(async () => generatedEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const cb = vi.fn();
    await generateRandomCard(judokaData, gokyoData, container, true, cb);
    expect(cb).toHaveBeenCalledWith(judokaData[0]);
  });

  it("falls back to id 0 when selection fails", async () => {
    const container = document.createElement("div");
    const fallbackEl = document.createElement("div");
    const gokyoData = getGokyoFixture();

    getRandomJudokaMock = vi.fn(() => {
      throw new Error("fail");
    });
    renderMock = vi.fn(async () => fallbackEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");

    await generateRandomCard([], gokyoData, container, true);

    expect(renderMock).toHaveBeenCalled();
    expect(container.firstChild).toBe(fallbackEl);
  });

  it("does not refetch gokyo data when falling back", async () => {
    const container = document.createElement("div");
    const fallbackEl = document.createElement("div");

    getRandomJudokaMock = vi.fn(() => {
      throw new Error("fail");
    });
    renderMock = vi.fn(async () => fallbackEl);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    fetchJson.mockResolvedValue(gokyoData);

    await generateRandomCard(judokaData, undefined, container, true);

    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining("gokyo.json"));
    expect(container.firstChild).toBe(fallbackEl);
  });

  it("does not throw if container is null or undefined", async () => {
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    renderMock = vi.fn(async () => document.createElement("div"));
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    await expect(generateRandomCard(judokaData, gokyoData, null, true)).resolves.toBeUndefined();
    await expect(
      generateRandomCard(judokaData, gokyoData, undefined, true)
    ).resolves.toBeUndefined();
  });

  it("handles render throwing an error", async () => {
    const container = document.createElement("div");
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    renderMock = vi.fn(async () => {
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
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    renderMock = vi.fn(async () => null);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    await generateRandomCard(judokaData, gokyoData, container, true);
    expect(container.childNodes.length).toBe(0);
  });
});
