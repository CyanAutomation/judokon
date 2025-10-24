import { describe, it, expect } from "vitest";
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

const gokyoLookup = { 1: { id: 1, name: "Uchi-mata" } };

describe("judoka card flip interactivity", () => {
  it("toggles the checkbox when the card is clicked", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    const toggle = container.querySelector(".card-flip-toggle");
    expect(toggle).not.toBeNull();
    expect(toggle.checked).toBe(false);
    card.click();
    expect(toggle.checked).toBe(true);
    card.click();
    expect(toggle.checked).toBe(false);
  });

  it("toggles the checkbox when Enter is pressed", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    const toggle = container.querySelector(".card-flip-toggle");
    expect(toggle).not.toBeNull();
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    card.dispatchEvent(event);
    expect(toggle.checked).toBe(true);
  });

  it("toggles the checkbox when Space is pressed", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    const card = container.querySelector(".judoka-card");
    const toggle = container.querySelector(".card-flip-toggle");
    expect(toggle).not.toBeNull();
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
    card.dispatchEvent(event);
    expect(toggle.checked).toBe(true);
  });

  it("keeps focus on the card after keyboard toggles", async () => {
    const container = await new JudokaCard(judoka, gokyoLookup).render();
    document.body.appendChild(container);
    const card = container.querySelector(".judoka-card");
    const toggle = container.querySelector(".card-flip-toggle");
    expect(toggle).not.toBeNull();
    card.focus();
    expect(document.activeElement).toBe(card);
    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    card.dispatchEvent(enterEvent);
    await Promise.resolve();
    expect(toggle.checked).toBe(true);
    expect(document.activeElement).toBe(card);
    container.remove();
  });
});
