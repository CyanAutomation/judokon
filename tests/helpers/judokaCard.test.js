import { describe, it, expect, vi } from "vitest";
import { JudokaCard } from "../../src/components/JudokaCard.js";
import { toggleInspectorPanels } from "../../src/helpers/cardUtils.js";
import { naturalClick } from "../utils/componentTestUtils.js";

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
  id: 2,
  firstname: "Jane",
  surname: "Smith",
  country: "USA",
  countryCode: "us",
  stats: { power: 8, speed: 7, technique: 6, kumikata: 5, newaza: 4 },
  weightClass: "-78kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "female"
};

const gokyoLookup = { 1: { id: 1, name: "Uchi-mata" } };

describe("JudokaCard", () => {
  it("obscures stats and name when useObscuredStats is true", async () => {
    const card = await new JudokaCard(judoka, gokyoLookup, { useObscuredStats: true }).render();
    expect(card.querySelector(".firstname").textContent).toBe("?");
    expect(card.querySelector(".surname").textContent).toBe("?");
    card.querySelectorAll(".card-stats span").forEach((el) => {
      expect(el.textContent).toBe("?");
    });
  });

  it("injects inspector panel when enabled", async () => {
    const card = await new JudokaCard(judoka, gokyoLookup, { enableInspector: true }).render();
    const panel = card.querySelector(".debug-panel");
    const summary = panel?.querySelector("summary");
    expect(panel).toBeTruthy();
    expect(summary).toBeTruthy();
    naturalClick(summary);
    expect(card.dataset.inspector).toBe("true");
    expect(card.getAttribute("data-feature-card-inspector")).toBe("enabled");
    expect(card.querySelector(".judoka-card")?.getAttribute("data-feature-card-inspector")).toBe(
      "enabled"
    );
    expect(panel?.getAttribute("data-feature-card-inspector")).toBe("panel");
  });

  it("toggleInspectorPanels updates existing cards", async () => {
    const card = await new JudokaCard(judoka, gokyoLookup).render();
    document.body.appendChild(card);
    expect(card.getAttribute("data-feature-card-inspector")).toBe("disabled");
    expect(card.querySelector(".judoka-card")?.getAttribute("data-feature-card-inspector")).toBe(
      "disabled"
    );
    toggleInspectorPanels(true);
    const panel = card.querySelector(".debug-panel");
    expect(panel).toBeTruthy();
    expect(card.getAttribute("data-feature-card-inspector")).toBe("enabled");
    expect(card.querySelector(".judoka-card")?.getAttribute("data-feature-card-inspector")).toBe(
      "enabled"
    );
    toggleInspectorPanels(false);
    expect(card.querySelector(".debug-panel")).toBeNull();
    expect(card.getAttribute("data-feature-card-inspector")).toBe("disabled");
    expect(card.querySelector(".judoka-card")?.getAttribute("data-feature-card-inspector")).toBe(
      "disabled"
    );
  });

  it("toggleInspectorPanels warns and skips on invalid JSON", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const card = await new JudokaCard(judoka, gokyoLookup).render();
    document.body.appendChild(card);
    card.dataset.cardJson = "{invalid";
    toggleInspectorPanels(true);
    expect(card.querySelector(".debug-panel")).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(card.getAttribute("data-feature-card-inspector")).toBe("error");
    expect(card.querySelector(".judoka-card")?.getAttribute("data-feature-card-inspector")).toBe(
      "error"
    );
    card.remove();
    warn.mockRestore();
  });

  it("does not throw when document is unavailable", () => {
    vi.stubGlobal("document", undefined);

    expect(() => toggleInspectorPanels(true)).not.toThrow();

    vi.unstubAllGlobals();
  });
});
