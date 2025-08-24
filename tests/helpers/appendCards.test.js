import { describe, it, expect, vi } from "vitest";

describe("appendCards", () => {
  it("replaces broken images with fallback card", async () => {
    const defaultJudoka = { id: 0, firstname: "Default", surname: "Card" };
    const generateJudokaCard = vi.fn(async (judoka, _gokyo, container) => {
      const card = document.createElement("div");
      card.setAttribute("data-judoka-name", `${judoka.firstname} ${judoka.surname}`);
      const img = document.createElement("img");
      card.appendChild(img);
      if (container) container.appendChild(card);
      return card;
    });
    const getFallbackJudoka = vi.fn(async () => defaultJudoka);
    vi.doMock("../../src/helpers/cardBuilder.js", () => ({ generateJudokaCard }));
    vi.doMock("../../src/helpers/judokaUtils.js", () => ({ getFallbackJudoka }));
    vi.doMock("../../src/helpers/judokaValidation.js", () => ({
      getMissingJudokaFields: () => [],
      hasRequiredJudokaFields: () => true
    }));

    const { appendCards } = await import("../../src/helpers/carousel/cards.js");

    const container = document.createElement("div");
    const judokaList = [{ id: 1, firstname: "Real", surname: "Judoka" }];
    const replacementPromise = appendCards(container, judokaList, {});
    await Promise.resolve();

    const initialCard = container.firstElementChild;
    const img = initialCard.querySelector("img");
    img.dispatchEvent(new Event("error"));
    await replacementPromise;

    expect(getFallbackJudoka).toHaveBeenCalled();
    expect(container.children.length).toBe(1);
    expect(container.firstElementChild.getAttribute("data-judoka-name")).toBe("Default Card");
  });
});
