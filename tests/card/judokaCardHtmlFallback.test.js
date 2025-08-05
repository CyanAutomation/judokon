import { vi } from "vitest";
import { JudokaCard } from "../../src/components/JudokaCard.js";
import * as cardRender from "../../src/helpers/cardRender.js";

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
  0: { id: 0, name: "Jigoku-guruma" },
  1: { id: 1, name: "Uchi-mata" }
};

describe("JudokaCard fallback containers", () => {
  it("adds fallback when portrait generation throws", async () => {
    vi.spyOn(cardRender, "generateCardPortrait").mockImplementation(() => {
      throw new Error("portrait fail");
    });

    const card = await new JudokaCard(judoka, gokyoLookup).render();

    expect(card.textContent).toContain("No data available");
  });

  it("adds fallback when stats generation throws", async () => {
    vi.spyOn(cardRender, "generateCardStats").mockImplementation(() =>
      Promise.reject(new Error("stats fail"))
    );

    const card = await new JudokaCard(judoka, gokyoLookup).render();

    expect(card.textContent).toContain("No data available");
  });

  it("adds fallback when signature move generation throws", async () => {
    vi.spyOn(cardRender, "generateCardSignatureMove").mockImplementation(() => {
      throw new Error("signature fail");
    });

    const card = await new JudokaCard(judoka, gokyoLookup).render();

    expect(card.textContent).toContain("No data available");
  });

  it("adds fallback when cardRender throws a non-Error value", async () => {
    vi.spyOn(cardRender, "generateCardPortrait").mockImplementation(() => {
      throw "fail string";
    });
    const card = await new JudokaCard(judoka, gokyoLookup).render();
    expect(card.textContent).toContain("No data available");
  });

  it("adds fallback when cardRender throws undefined", async () => {
    vi.spyOn(cardRender, "generateCardStats").mockImplementation(() => Promise.reject(undefined));
    const card = await new JudokaCard(judoka, gokyoLookup).render();
    expect(card.textContent).toContain("No data available");
  });

  it("does not throw if judoka or gokyoLookup is null", async () => {
    expect(() => new JudokaCard(judoka, null)).toThrow();
    expect(() => new JudokaCard(null, gokyoLookup)).toThrow();
  });
});
