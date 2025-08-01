import { describe, it, expect, vi } from "vitest";

let generateMock;
let setupLazyPortraitsMock;

vi.mock("../../src/helpers/cardBuilder.js", () => {
  const createInspectorPanel = (container) => {
    const panel = document.createElement("details");
    panel.className = "debug-panel";
    panel.addEventListener("toggle", () => {
      if (panel.open) {
        container.dataset.inspector = "true";
      } else {
        container.removeAttribute("data-inspector");
      }
    });
    return panel;
  };
  return {
    generateJudokaCardHTML: async (j, g, opts) => {
      const el = await generateMock(j, g, opts);
      if (opts?.enableInspector) {
        el.appendChild(createInspectorPanel(el));
      }
      return el;
    },
    createInspectorPanel
  };
});
vi.mock("../../src/helpers/lazyPortrait.js", () => ({
  setupLazyPortraits: (...args) => setupLazyPortraitsMock(...args)
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

describe("renderJudokaCard", () => {
  it("obscures stats and name when useObscuredStats is true", async () => {
    generateMock = vi.fn(async () => document.createElement("div"));
    setupLazyPortraitsMock = vi.fn();
    const { renderJudokaCard } = await import("../../src/helpers/cardUtils.js");
    const container = document.createElement("div");
    await renderJudokaCard(judoka, {}, container, { useObscuredStats: true });
    const calledJudoka = generateMock.mock.calls[0][0];
    expect(calledJudoka.firstname).toBe("?");
    expect(calledJudoka.surname).toBe("?");
    Object.values(calledJudoka.stats).forEach((v) => expect(v).toBe("?"));
  });

  it("injects inspector panel when enabled", async () => {
    const wrapper = document.createElement("div");
    const cardEl = document.createElement("div");
    cardEl.className = "judoka-card";
    cardEl.innerHTML =
      '<div class="card-top-bar"></div><div class="card-portrait"></div><div class="card-stats"></div><div class="signature-move-container" data-tooltip-id="ui.signatureBar"></div>';
    wrapper.className = "card-container";
    wrapper.appendChild(cardEl);
    generateMock = vi.fn(async () => wrapper);
    setupLazyPortraitsMock = vi.fn();
    const { renderJudokaCard } = await import("../../src/helpers/cardUtils.js");
    const container = document.createElement("div");
    const card = await renderJudokaCard(judoka, {}, container, {
      enableInspector: true
    });
    const panel = card.querySelector(".debug-panel");
    expect(panel).toBeTruthy();
    panel.open = true;
    panel.dispatchEvent(new Event("toggle"));
    expect(card.dataset.inspector).toBe("true");
  });

  it("toggleInspectorPanels updates existing cards", async () => {
    const container = document.createElement("div");
    container.className = "card-container";
    container.dataset.cardJson = JSON.stringify(judoka);
    const card = document.createElement("div");
    card.className = "judoka-card";
    card.innerHTML =
      '<div class="card-top-bar"></div><div class="card-portrait"></div><div class="card-stats"></div><div class="signature-move-container" data-tooltip-id="ui.signatureBar"></div>';
    container.appendChild(card);
    document.body.appendChild(container);
    const { toggleInspectorPanels } = await import("../../src/helpers/cardUtils.js");
    toggleInspectorPanels(true);
    const panel = container.querySelector(".debug-panel");
    expect(panel).toBeTruthy();
    toggleInspectorPanels(false);
    expect(container.querySelector(".debug-panel")).toBeNull();
  });

  it("retains existing debug panel when rendering", async () => {
    generateMock = vi.fn(async () => document.createElement("div"));
    setupLazyPortraitsMock = vi.fn();
    const { renderJudokaCard } = await import("../../src/helpers/cardUtils.js");
    const container = document.createElement("div");
    const debugPanel = document.createElement("div");
    debugPanel.id = "debug-panel";
    container.appendChild(debugPanel);
    await renderJudokaCard(judoka, {}, container);
    expect(container.querySelector("#debug-panel")).toBe(debugPanel);
  });
});
