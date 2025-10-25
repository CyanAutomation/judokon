import { describe, it, expect } from "vitest";
import { JudokaCard } from "../../src/components/JudokaCard.js";
import { interactions } from "../utils/componentTestUtils.js";

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

const gokyoLookup = { 1: { id: 1, name: "Uchi-mata" } };

describe("judoka card flip interactivity", () => {
  it("toggles the pressed state when the card is clicked", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    expect(card).not.toBeNull();
    expect(card.tagName).toBe("BUTTON");
    expect(card.getAttribute("aria-pressed")).toBe("false");
    card.click();
    expect(card.getAttribute("aria-pressed")).toBe("true");
    card.click();
    expect(card.getAttribute("aria-pressed")).toBe("false");
  });

  it("toggles the pressed state when Enter is pressed", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    expect(card).not.toBeNull();
    interactions.keypress(card, "Enter");
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles the pressed state when Space is pressed", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    expect(card).not.toBeNull();
    interactions.keypress(card, " ");
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps focus on the card after keyboard toggles", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    document.body.appendChild(container);
    const card = container.querySelector(".judoka-card");
    expect(card).not.toBeNull();
    card.focus();
    expect(document.activeElement).toBe(card);
    interactions.keypress(card, "Enter");
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(card);
    container.remove();
  });
});
