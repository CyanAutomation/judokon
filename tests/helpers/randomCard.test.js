import { describe, it, expect, vi } from "vitest";
import { getJudokaFixture, getGokyoFixture } from "../utils/testUtils.js";
import { withMutedConsole } from "../utils/console.js";

let getRandomJudokaMock;
const renderMock = vi.fn();
let JudokaCardMock;
let getFallbackJudokaMock;
let createGokyoLookupMock;
let fetchJsonMock;
let showSnackbarMock;

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
  createGokyoLookup: (...args) => createGokyoLookupMock(...args)
}));

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: (...args) => showSnackbarMock(...args)
}));

describe("loadGokyoLookup", () => {
  it("returns lookup from provided data", async () => {
    const gokyoData = getGokyoFixture();
    const lookup = { 1: gokyoData[0] };
    createGokyoLookupMock = vi.fn(() => lookup);
    fetchJsonMock = vi.fn();
    showSnackbarMock = vi.fn();

    const { loadGokyoLookup } = await import("../../src/helpers/randomCard.js");
    const result = await loadGokyoLookup(gokyoData);

    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(createGokyoLookupMock).toHaveBeenCalledWith(gokyoData);
    expect(result).toBe(lookup);
  });

  it("falls back and notifies when fetch fails", async () => {
    await withMutedConsole(async () => {
      const lookup = { 0: { id: 0, name: "Jigoku-guruma" } };
      createGokyoLookupMock = vi.fn(() => lookup);
      fetchJsonMock = vi.fn().mockRejectedValue(new Error("fail"));
      showSnackbarMock = vi.fn();

      const { loadGokyoLookup } = await import("../../src/helpers/randomCard.js");
      const result = await loadGokyoLookup();

      expect(fetchJsonMock).toHaveBeenCalled();
      expect(createGokyoLookupMock).toHaveBeenCalledWith([
        { id: 0, name: "Jigoku-guruma" }
      ]);
      expect(showSnackbarMock).toHaveBeenCalled();
      expect(result).toBe(lookup);
    });
  });
});

describe("pickJudoka", () => {
  it("selects judoka and calls callback", async () => {
    const judokaData = getJudokaFixture().slice(0, 2);
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    fetchJsonMock = vi.fn();
    const cb = vi.fn();

    const { pickJudoka } = await import("../../src/helpers/randomCard.js");
    const selected = await pickJudoka(judokaData, cb);

    expect(selected).toEqual(judokaData[0]);
    expect(cb).toHaveBeenCalledWith(judokaData[0]);
    expect(fetchJsonMock).not.toHaveBeenCalled();
  });

  it("returns fallback judoka on error", async () => {
    await withMutedConsole(async () => {
      const judokaData = getJudokaFixture().slice(0, 2);
      const fallback = { id: 0 };
      getRandomJudokaMock = vi.fn(() => {
        throw new Error("fail");
      });
      getFallbackJudokaMock = vi.fn(async () => fallback);
      fetchJsonMock = vi.fn();
      const cb = vi.fn();

      const { pickJudoka } = await import("../../src/helpers/randomCard.js");
      const result = await pickJudoka(judokaData, cb);

      expect(result).toEqual(fallback);
      expect(cb).toHaveBeenCalledWith(fallback);
    });
  });
});

describe("renderJudokaCard", () => {
  it("renders card into container", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    renderMock.mockClear();
    renderMock.mockResolvedValue(generatedEl);

    const { renderJudokaCard } = await import("../../src/helpers/randomCard.js");
    await renderJudokaCard({ id: 1 }, {}, container, true);

    expect(container.firstChild).toBe(generatedEl);
  });

  it("handles render errors", async () => {
    await withMutedConsole(async () => {
      const container = document.createElement("div");
      renderMock.mockClear();
      renderMock.mockRejectedValue(new Error("fail"));

      const { renderJudokaCard } = await import("../../src/helpers/randomCard.js");
      await renderJudokaCard({ id: 1 }, {}, container, true);

      expect(container.childNodes.length).toBe(0);
    });
  });
});

describe("generateRandomCard", () => {
  it("selects a random judoka and updates the DOM", async () => {
    const container = document.createElement("div");
    const generatedEl = document.createElement("span");
    generatedEl.textContent = "card";
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();

    getRandomJudokaMock = vi.fn(() => judokaData[1]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    createGokyoLookupMock = vi.fn(() => ({}));
    fetchJsonMock = vi.fn();

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
    createGokyoLookupMock = vi.fn(() => ({}));
    fetchJsonMock = vi.fn();
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(generatedEl);
    const cb = vi.fn();
    await generateRandomCard(judokaData, gokyoData, container, true, cb);
    expect(cb).toHaveBeenCalledWith(judokaData[0]);
  });

  it("selects judoka when rendering is skipped", async () => {
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    createGokyoLookupMock = vi.fn(() => ({}));
    fetchJsonMock = vi.fn();
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    const cb = vi.fn();
    renderMock.mockClear();
    await generateRandomCard(judokaData, gokyoData, null, true, cb, { skipRender: true });
    expect(cb).toHaveBeenCalledWith(judokaData[0]);
    expect(JudokaCardMock).not.toHaveBeenCalled();
  });

  it("falls back to id 0 when selection fails", async () => {
    await withMutedConsole(async () => {
      const container = document.createElement("div");
      const fallbackEl = document.createElement("div");
      const judokaData = getJudokaFixture().slice(0, 2);
      const gokyoData = getGokyoFixture();

      getRandomJudokaMock = vi.fn(() => {
        throw new Error("fail");
      });
      getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
      createGokyoLookupMock = vi.fn(() => ({}));
      fetchJsonMock = vi.fn();

      const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
      renderMock.mockClear();
      renderMock.mockResolvedValue(fallbackEl);

      await generateRandomCard(judokaData, gokyoData, container, true);

      expect(renderMock).toHaveBeenCalled();
      expect(container.firstChild).toBe(fallbackEl);
    });
  });

  it("does not refetch gokyo data when falling back", async () => {
    await withMutedConsole(async () => {
      const container = document.createElement("div");
      const fallbackEl = document.createElement("div");

      getRandomJudokaMock = vi.fn(() => {
        throw new Error("fail");
      });
      getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
      createGokyoLookupMock = vi.fn(() => ({}));
      fetchJsonMock = vi.fn().mockResolvedValue(getGokyoFixture());

      const judokaData = getJudokaFixture().slice(0, 2);
      const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
      renderMock.mockClear();
      renderMock.mockResolvedValue(fallbackEl);

      await generateRandomCard(judokaData, undefined, container, true);

      expect(fetchJsonMock).toHaveBeenCalledTimes(1);
      expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining("gokyo.json"));
      expect(container.firstChild).toBe(fallbackEl);
    });
  });

  it("does not throw if container is null or undefined", async () => {
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    createGokyoLookupMock = vi.fn(() => ({}));
    fetchJsonMock = vi.fn();
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(document.createElement("div"));
    await expect(generateRandomCard(judokaData, gokyoData, null, true)).resolves.toBeUndefined();
    await expect(
      generateRandomCard(judokaData, gokyoData, undefined, true)
    ).resolves.toBeUndefined();
  });

  it("handles render throwing an error", async () => {
    await withMutedConsole(async () => {
      const container = document.createElement("div");
      const judokaData = getJudokaFixture().slice(0, 2);
      const gokyoData = getGokyoFixture();
      getRandomJudokaMock = vi.fn(() => judokaData[0]);
      getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
      createGokyoLookupMock = vi.fn(() => ({}));
      fetchJsonMock = vi.fn();
      const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
      renderMock.mockClear();
      renderMock.mockRejectedValue(new Error("fail"));
      await expect(
        generateRandomCard(judokaData, gokyoData, container, true)
      ).resolves.toBeUndefined();
      expect(container.childNodes.length).toBe(0);
    });
  });

  it("does not update DOM if generated element is null or undefined", async () => {
    const container = document.createElement("div");
    const judokaData = getJudokaFixture().slice(0, 2);
    const gokyoData = getGokyoFixture();
    getRandomJudokaMock = vi.fn(() => judokaData[0]);
    getFallbackJudokaMock = vi.fn(async () => ({ id: 0 }));
    createGokyoLookupMock = vi.fn(() => ({}));
    fetchJsonMock = vi.fn();
    const { generateRandomCard } = await import("../../src/helpers/randomCard.js");
    renderMock.mockClear();
    renderMock.mockResolvedValue(null);
    await generateRandomCard(judokaData, gokyoData, container, true);
    expect(container.childNodes.length).toBe(0);
  });
});

