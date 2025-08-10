import { describe, it, expect } from "vitest";
import { generateJudokaCardHTML } from "../../src/helpers/cardBuilder.js";

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
  it("throws error when required fields are missing", async () => {
    const incomplete = { ...VALID_JUDOKA };
    delete incomplete.countryCode;
    await expect(generateJudokaCardHTML(incomplete, GOKYO_LOOKUP)).rejects.toThrow(
      /Missing required fields/
    );
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
