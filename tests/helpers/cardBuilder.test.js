import { describe, it, expect, afterEach, vi } from "vitest";

import * as cardRender from "../../src/helpers/cardRender.js";
import { generateJudokaCardHTML } from "../../src/helpers/cardBuilder.js";
import { withMutedConsole } from "../utils/console.js";

const VALID_JUDOKA = {
  id: 1,
  firstname: "Jane",
  surname: "Doe",
  country: "USA",
  countryCode: "us",
  stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
  weightClass: "-63kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "female"
};

const GOKYO_LOOKUP = { 1: { id: 1, name: "Ouchi-gari" } };

describe("generateJudokaCardHTML", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws error when required fields are missing", async () => {
    const incomplete = { ...VALID_JUDOKA };
    delete incomplete.countryCode;
    await expect(generateJudokaCardHTML(incomplete, GOKYO_LOOKUP)).rejects.toThrow(
      /Missing required fields/
    );
  });

  it("renders structured markup for the judoka card", async () => {
    const container = await generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP);

    expect(container.classList.contains("card-container")).toBe(true);
    expect(container.dataset.cardJson).toBeDefined();
    expect(() => JSON.parse(container.dataset.cardJson ?? "{}")).not.toThrow();

    const card = container.querySelector(".judoka-card");
    expect(card).toBeTruthy();
    expect(card.classList.contains("common")).toBe(true);
    expect(card.classList.contains("female-card")).toBe(true);

    const topBar = card?.querySelector(".card-top-bar");
    expect(topBar).toBeTruthy();
    const firstname = topBar?.querySelector(".card-name .firstname");
    expect(firstname?.textContent).toBe("Jane");
    const surname = topBar?.querySelector(".card-name .surname");
    expect(surname?.textContent).toBe("Doe");

    const weightClass = card?.querySelector(".card-weight-class");
    expect(weightClass?.textContent).toBe("-63kg");
    expect(weightClass?.dataset.tooltipId).toBe("card.weightClass");

    const stats = card?.querySelector(".card-stats");
    expect(stats).toBeTruthy();
    expect(stats?.classList.contains("common")).toBe(true);
    const statItems = stats?.querySelectorAll("li.stat");
    expect(statItems?.length).toBe(5);

    const signature = card?.querySelector(".signature-move-container");
    expect(signature).toBeTruthy();
    expect(signature?.classList.contains("common")).toBe(true);
    expect(signature?.dataset.tooltipId).toBe("ui.signatureBar");
    expect(signature?.querySelector(".signature-move-label")?.textContent).toBe("Signature Move:");
    expect(signature?.querySelector(".signature-move-value")?.textContent).toBe("Ouchi-gari");

    expect(container.querySelector(".debug-panel")).toBeNull();
  });

  it("exposes inspector metadata without enabling the inspector panel", async () => {
    const container = await generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP, {
      enableInspector: false
    });

    expect(container.dataset.inspector).toBeUndefined();
    expect(container.hasAttribute("data-inspector")).toBe(false);
    expect(container.querySelector(".debug-panel")).toBeNull();
    expect(container.dataset.cardJson).toBeDefined();

    const parsed = JSON.parse(container.dataset.cardJson ?? "{}");
    expect(parsed.firstname).toBe("Jane");
    expect(parsed.signatureMoveId).toBe(1);
  });

  it("renders fallback sections when a card section fails to build", async () => {
    vi.spyOn(cardRender, "generateCardPortrait").mockImplementation(() => {
      throw new Error("portrait failure");
    });
    vi.spyOn(cardRender, "generateCardStats").mockRejectedValue(new Error("stats failure"));
    vi.spyOn(cardRender, "generateCardSignatureMove").mockImplementation(() => {
      throw new Error("signature failure");
    });

    const container = await withMutedConsole(() =>
      generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP)
    );

    const card = container.querySelector(".judoka-card");
    expect(card).toBeTruthy();
    expect(card?.querySelector(".card-portrait")).toBeNull();
    expect(card?.querySelector(".card-stats")).toBeNull();
    expect(card?.querySelector(".signature-move-container")).toBeNull();

    const fallbackSections = Array.from(card?.children ?? []).slice(1);
    expect(fallbackSections).toHaveLength(3);
    fallbackSections.forEach((section) => {
      expect(section.classList.contains("card-top-bar")).toBe(true);
      expect(section.textContent).toContain("No data available");
    });
  });

  it("toggles inspector dataset on panel toggle", async () => {
    const container = await generateJudokaCardHTML(VALID_JUDOKA, GOKYO_LOOKUP, {
      enableInspector: true
    });
    const panel = container.querySelector(".debug-panel");
    expect(panel).toBeTruthy();
    expect(container.dataset.inspector).toBeUndefined();
    panel.open = true;
    panel.dispatchEvent(new Event("toggle"));
    expect(container.dataset.inspector).toBe("true");
    panel.open = false;
    panel.dispatchEvent(new Event("toggle"));
    expect(container.dataset.inspector).toBeUndefined();
  });
});
