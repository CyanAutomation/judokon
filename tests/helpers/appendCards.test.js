import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSimpleHarness } from "./integrationHarness.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  mockGenerateJudokaCard,
  mockGetFallbackJudoka,
  mockGetMissingJudokaFields,
  mockHasRequiredJudokaFields
} = vi.hoisted(() => ({
  mockGenerateJudokaCard: vi.fn(async (judoka, _gokyo, container) => {
    const card = document.createElement("div");
    card.setAttribute("data-judoka-name", `${judoka.firstname} ${judoka.surname}`);
    const img = document.createElement("img");
    card.appendChild(img);
    if (container) container.appendChild(card);
    return card;
  }),
  mockGetFallbackJudoka: vi.fn(async () => ({ id: 0, firstname: "Default", surname: "Card" })),
  mockGetMissingJudokaFields: vi.fn(() => []),
  mockHasRequiredJudokaFields: vi.fn(() => true)
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/cardBuilder.js", () => ({
  generateJudokaCard: mockGenerateJudokaCard
}));

vi.mock("../../src/helpers/judokaUtils.js", () => ({
  getFallbackJudoka: mockGetFallbackJudoka
}));

vi.mock("../../src/helpers/judokaValidation.js", () => ({
  getMissingJudokaFields: mockGetMissingJudokaFields,
  hasRequiredJudokaFields: mockHasRequiredJudokaFields
}));

describe("appendCards", () => {
  let harness;

  beforeEach(async () => {
    // Reset mocks before each test
    mockGenerateJudokaCard.mockReset().mockImplementation(async (judoka, _gokyo, container) => {
      const card = document.createElement("div");
      card.setAttribute("data-judoka-name", `${judoka.firstname} ${judoka.surname}`);
      const img = document.createElement("img");
      card.appendChild(img);
      if (container) container.appendChild(card);
      return card;
    });
    mockGetFallbackJudoka.mockReset().mockResolvedValue({ id: 0, firstname: "Default", surname: "Card" });
    mockGetMissingJudokaFields.mockReset().mockReturnValue([]);
    mockHasRequiredJudokaFields.mockReset().mockReturnValue(true);

    harness = createSimpleHarness();
    await harness.setup();
  });

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
    }
  });

  it("replaces broken images with fallback card", async () => {
    const { appendCards } = await harness.importModule(
      "../../src/helpers/carousel/cards.js"
    );

    const container = document.createElement("div");
    const judokaList = [{ id: 1, firstname: "Real", surname: "Judoka" }];
    const { ready } = appendCards(container, judokaList, {});

    const initialCard = container.firstElementChild;
    const img = initialCard.querySelector("img");
    queueMicrotask(() => img.dispatchEvent(new Event("error")));
    await ready;

    expect(mockGetFallbackJudoka).toHaveBeenCalled();
    expect(container.children.length).toBe(1);
    expect(container.firstElementChild.getAttribute("data-judoka-name")).toBe("Default Card");
  });
});
