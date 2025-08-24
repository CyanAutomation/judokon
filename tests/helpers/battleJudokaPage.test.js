import { describe, it, expect, vi } from "vitest";

vi.doMock("../../src/helpers/domReady.js", () => ({
  onDomReady: vi.fn()
}));

describe("waitForOpponentCard", () => {
  it("resolves when the judoka card is inserted", async () => {
    const { waitForOpponentCard } = await import("../../src/helpers/battleJudokaPage.js");

    const container = document.createElement("div");
    container.id = "opponent-card";
    document.body.append(container);

    const callbacks = [];
    class ObserveStub {
      constructor(cb) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    }

    const promise = waitForOpponentCard(undefined, ObserveStub);

    const card = document.createElement("div");
    card.className = "judoka-card";
    container.appendChild(card);

    callbacks.forEach((cb) => cb());

    await expect(promise).resolves.toBeUndefined();
  });

  it("resolves immediately if card already present", async () => {
    const { waitForOpponentCard } = await import("../../src/helpers/battleJudokaPage.js");

    const container = document.createElement("div");
    container.id = "opponent-card";
    const card = document.createElement("div");
    card.className = "judoka-card";
    container.appendChild(card);
    document.body.append(container);

    await expect(waitForOpponentCard()).resolves.toBeUndefined();
  });
});
