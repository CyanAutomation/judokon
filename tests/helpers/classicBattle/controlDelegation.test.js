import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bindControlDelegation,
  resetControlDelegationForTests
} from "../../../src/helpers/classicBattle/controlDelegation.js";

describe("controlDelegation", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main class="battle-page">
        <div id="battle-area">
          <button id="next-button" data-action="next">Next</button>
          <button id="replay-button" data-action="replay">Replay</button>
          <button id="quit-button" data-action="quit">Quit</button>
        </div>
      </main>
    `;
    resetControlDelegationForTests();
  });

  it("routes click events by data-action on a persistent root", async () => {
    const onNext = vi.fn();
    const onReplay = vi.fn();
    const onQuit = vi.fn();

    bindControlDelegation(document.getElementById("battle-area"), { onNext, onReplay, onQuit });

    document.getElementById("next-button").click();
    document.getElementById("replay-button").click();
    document.getElementById("quit-button").click();

    await Promise.resolve();

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it("keeps delegated routing after control button replacement", async () => {
    const onQuit = vi.fn();
    const root = document.getElementById("battle-area");
    bindControlDelegation(root, { onQuit });

    const quitBefore = document.getElementById("quit-button");
    const replacement = quitBefore.cloneNode(true);
    quitBefore.replaceWith(replacement);

    replacement.click();
    await Promise.resolve();

    expect(replacement).not.toBe(quitBefore);
    expect(onQuit).toHaveBeenCalledTimes(1);
  });
});
