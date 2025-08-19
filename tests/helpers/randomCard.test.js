import { describe, it, expect, vi } from "vitest";
import { getJudokaFixture, getGokyoFixture } from "../utils/testUtils.js";

let getRandomJudokaMock;
const renderMock = vi.fn();
let JudokaCardMock;
let getFallbackJudokaMock;

vi.mock("../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));

vi.mock("../../src/components/JudokaCard.js", () => {
  JudokaCardMock = vi.fn(function () {
    return { render: renderMock };
  });
  return { JudokaCard: JudokaCardMock };
});

vi.mock("../../src/helpers/judokaUtils.js", () => ({
  getFallbackJudoka: (...args) => getFallbackJudokaMock(...args)
}));

vi.mock("../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

describe("generateRandomCard", () => {
  it("selects a random judoka and updates the DOM", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    generatedEl.textContent = "card";
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();

    getRandomJudokaMock = vi.fn(() => judokaData[1]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(generatedEl);

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
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(generatedEl);
    const cb = vi.fn();
    await generateRandomCard(judokaData, gokyoData, container, true, cb);
    expect(cb).toHaveBeenCalledWith(judokaData[0]);
  });

  it("falls back to id 0 when selection fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const container = document.createElement("div");
      const fallbackEl = document.createElement("div");
      const judokaData = getJudokaFixture().slice(0, 2);
      const gokyoData = getGokyoFixture();

      getRandomJudokaMock = vi.fn(() => {
        throw new Error("fail");
      });
      getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

      const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
      renderMock.mockClear();
      renderMock.mockResolvedValue(fallbackEl);

      await generateRandomCard(judokaData, gokyoData, container, true);

      expect(renderMock).toHaveBeenCalled();
      expect(container.firstChild).toBe(fallbackEl);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("does not refetch gokyo data when falling back", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const container = document.createElement("div");
      const fallbackEl = document.createElement("div");

      getRandomJudokaMock = vi.fn(() => {
        throw new Error("fail");
      });
      getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));

      const judokaData = getJudokaFixture().slice(0, 2);
      const gokyoData = getGokyoFixture();
      const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
      const { fetchJson } = await import("../../src/helpers/dataUtils.js");
      renderMock.mockClear();
      renderMock.mockResolvedValue(fallbackEl);
      fetchJson.mockResolvedValue(gokyoData);

      await generateRandomCard(judokaData, undefined, container, true);

      expect(fetchJson).toHaveBeenCalledTimes(1);
      expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining("gokyo.json"));
      expect(container.firstChild).toBe(fallbackEl);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("does not throw if container is null or undefined", async () => {
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(document.createElement("div"));
    await expect(generateRandomCard(judokaData, gokyoData, null, true)).resolves.toBeUndefined();
    await expect(
      generateRandomCard(judokaData, gokyoData, undefined, true)
    ).resolves.toBeUndefined();
  });

  it("handles render throwing an error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const container = document.createElement("div");
      const judokaData = getJudokaFixture().slice(0, 2);
      const gokyoData = getGokyoFixture();
      getRandomJudokaMock = vi.fn(() => judokaData[0]);
      getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
      const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
      renderMock.mockClear();
      renderMock.mockRejectedValue(new Error("fail"));
      await expect(
        generateRandomCard(judokaData, gokyoData, container, true)
      ).resolves.toBeUndefined();
      expect(container.childNodes.length).toBe(0);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("does not update DOM if generated element is null or undefined", async () => {
    const container = document.createElement("div");
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(null);
    await generateRandomCard(judokaData, gokyoData, container, true);
    expect(container.childNodes.length).toBe(0);
  });
});
