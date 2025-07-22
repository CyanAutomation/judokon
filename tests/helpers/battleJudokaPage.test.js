import { describe, it, expect, vi } from "vitest";

vi.doMock("../../src/helpers/domReady.js", () => ({
  onDomReady: vi.fn()
}));

describe("waitForComputerCard", () => {
  it("resolves when the judoka card is inserted", async () => {
    const { waitForComputerCard } = await import("../../src/helpers/battleJudokaPage.js");

    const container = document.createElement("div");
    container.id = "computer-card";
    document.body.append(container);

    const promise = waitForComputerCard();

    await Promise.resolve();
    const card = document.createElement("div");
    card.className = "judoka-card";
    container.appendChild(card);

    await expect(promise).resolves.toBeUndefined();
  });

  it("resolves immediately if card already present", async () => {
    const { waitForComputerCard } = await import("../../src/helpers/battleJudokaPage.js");

    const container = document.createElement("div");
    container.id = "computer-card";
    const card = document.createElement("div");
    card.className = "judoka-card";
    container.appendChild(card);
    document.body.append(container);

    await expect(waitForComputerCard()).resolves.toBeUndefined();
  });
});
